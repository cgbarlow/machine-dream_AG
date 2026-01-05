
export class SudokuGenerator {

    /**
     * Generates a valid, solvable Sudoku grid.
     * For POC, generates a solved grid then removes cells.
     */
    public generate(candidatesToRemove: number = 40): number[][] {
        const grid = Array(9).fill(0).map(() => Array(9).fill(0));
        this.fillGrid(grid);
        this.removeCells(grid, candidatesToRemove);
        return grid;
    }

    private fillGrid(grid: number[][]): boolean {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    const numbers = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                    for (const num of numbers) {
                        if (this.isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            if (this.fillGrid(grid)) return true; // Forward recursion
                            grid[row][col] = 0; // Backtrack
                        }
                    }
                    return false; // No valid number found
                }
            }
        }
        return true; // Filled
    }

    private removeCells(grid: number[][], count: number) {
        let removed = 0;
        while (removed < count) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (grid[row][col] !== 0) {
                grid[row][col] = 0;
                removed++;
            }
        }
    }

    private isValid(grid: number[][], row: number, col: number, num: number): boolean {
        // Row check
        for (let x = 0; x < 9; x++) if (grid[row][x] === num) return false;
        // Col check
        for (let x = 0; x < 9; x++) if (grid[x][col] === num) return false;
        // Box check
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[startRow + r][startCol + c] === num) return false;
            }
        }
        return true;
    }

    private shuffle(array: number[]): number[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
