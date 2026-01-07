
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalAgentDB } from '../../src/agentdb/LocalAgentDB';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = './.test_memory_unit.db';

describe('LocalAgentDB (Spec 02 & 08)', () => {
    let db: LocalAgentDB;

    beforeEach(() => {
        const dir = path.dirname(TEST_DB_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        db = new LocalAgentDB(TEST_DB_PATH);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_DB_PATH)) {
            try { fs.unlinkSync(TEST_DB_PATH); } catch (e) { /* Ignore cleanup errors */ }
        }
    });

    it('should initialize and create tables', () => {
        // Just verifying constructor didn't throw and file exists
        expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should log valid moves without error', async () => {
        const move = {
            cell: { row: 0, col: 0 },
            value: 1,
            strategy: 'unit-test',
            timestamp: Date.now()
        };
        const outcome = { outcome: 'success' } as any;

        await expect(db.reasoningBank.logMove(move, outcome)).resolves.not.toThrow();
    });

    it('should log strategies', async () => {
        await expect(db.reasoningBank.logStrategy('naked-single', { outcome: 'success' } as any)).resolves.not.toThrow();
    });
});
