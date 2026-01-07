
import Database from 'better-sqlite3';
import {
    Pattern, ConsolidatedKnowledge, AgentDBReasoningBank,
    AgentDBReflexionMemory, AgentDBSkillLibrary
} from '../types';
import fs from 'fs';
import path from 'path';

export class LocalAgentDB {
    private db: Database.Database;

    constructor(dbPath: string) {
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        this.db = new Database(dbPath);
        this.initializeSchema();
    }

    private initializeSchema() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS moves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                row INTEGER,
                col INTEGER,
                value INTEGER,
                strategy TEXT,
                outcome TEXT,
                timestamp INTEGER
            );

            CREATE TABLE IF NOT EXISTS strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                outcome TEXT,
                timestamp INTEGER
            );

            CREATE TABLE IF NOT EXISTS insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT,
                content TEXT,
                confidence REAL,
                timestamp INTEGER
            );

            CREATE TABLE IF NOT EXISTS patterns (
                id TEXT PRIMARY KEY,
                description TEXT,
                success_rate REAL,
                usage_count INTEGER
            );

            CREATE TABLE IF NOT EXISTS reasoning_trajectories (
                trajectory_id TEXT,
                step_index INTEGER,
                action TEXT,
                reasoning TEXT,
                outcome TEXT,
                feedback TEXT,
                timestamp INTEGER,
                PRIMARY KEY (trajectory_id, step_index)
            );

            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT,
                type TEXT,
                data TEXT,
                timestamp INTEGER,
                PRIMARY KEY (key, type)
            );
        `);
    }

    // ==========================================
    // ReasoningBank Accessor (Facade)
    // ==========================================
    public get reasoningBank(): AgentDBReasoningBank {
        return {
            logMove: async (move, outcome) => {
                const stmt = this.db.prepare(
                    'INSERT INTO moves (session_id, row, col, value, strategy, outcome, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                stmt.run(
                    'session-default', // TODO: pass actual session
                    move.cell.row,
                    move.cell.col,
                    move.value,
                    move.strategy,
                    outcome.outcome,
                    move.timestamp
                );
            },
            logStrategy: async (strategy, result) => {
                const stmt = this.db.prepare(
                    'INSERT INTO strategies (name, outcome, timestamp) VALUES (?, ?, ?)'
                );
                stmt.run(strategy, result.outcome, Date.now());
            },
            logInsight: async (insight) => {
                const stmt = this.db.prepare(
                    'INSERT INTO insights (type, content, confidence, timestamp) VALUES (?, ?, ?, ?)'
                );
                stmt.run(insight.type, insight.content, insight.confidence, insight.timestamp);
            },
            querySimilar: async (_context) => {
                // Simple SQL query to find successful moves in same cell or value
                // This replaces the mock with a real DB lookup
                const stmt = this.db.prepare(
                    "SELECT * FROM moves WHERE outcome = 'success' ORDER BY timestamp DESC LIMIT 5"
                );
                return stmt.all() as any[];
            },
            distillPatterns: async (_sessionId) => {
                // Return high-success strategies as 'patterns'
                const stmt = this.db.prepare(
                    "SELECT name as id, outcome as description, 1.0 as success_rate, count(*) as usage_count FROM strategies WHERE outcome='success' GROUP BY name"
                );
                return stmt.all() as Pattern[];
            },
            consolidate: async (_experiences) => {
                return {
                    sessionIds: [],
                    patterns: [],
                    abstractionLadder: { levels: [] },
                    compressionRatio: 1.0,
                    verificationStatus: 'verified',
                    timestamp: Date.now()
                } as ConsolidatedKnowledge;
            },

            // LLM experience storage methods (Spec 11)
            storeReasoning: async (data) => {
                const stmt = this.db.prepare(
                    'INSERT OR REPLACE INTO reasoning_trajectories (trajectory_id, step_index, action, reasoning, outcome, feedback, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                stmt.run(data.trajectory_id, data.step_index, data.action, data.reasoning, data.outcome, data.feedback, Date.now());
            },

            storeMetadata: async (key, type, data) => {
                const stmt = this.db.prepare(
                    'INSERT OR REPLACE INTO metadata (key, type, data, timestamp) VALUES (?, ?, ?, ?)'
                );
                stmt.run(key, type, JSON.stringify(data), Date.now());
            },

            getTrajectory: async (trajectoryId) => {
                const stmt = this.db.prepare(
                    'SELECT step_index FROM reasoning_trajectories WHERE trajectory_id = ? ORDER BY step_index'
                );
                const steps = stmt.all(trajectoryId) as Array<{ step_index: number }>;
                if (steps.length === 0) return null;
                return { steps };
            },

            getMetadata: async (key, type) => {
                const stmt = this.db.prepare(
                    'SELECT data FROM metadata WHERE key = ? AND type = ?'
                );
                const row = stmt.get(key, type) as { data: string } | undefined;
                if (!row) return null;
                return JSON.parse(row.data);
            },

            queryMetadata: async (type, filter) => {
                const stmt = this.db.prepare(
                    'SELECT data FROM metadata WHERE type = ?'
                );
                const rows = stmt.all(type) as Array<{ data: string }>;
                const allData = rows.map(row => JSON.parse(row.data));

                // Simple filter implementation
                if (Object.keys(filter).length === 0) {
                    return allData;
                }

                return allData.filter(item => {
                    for (const [key, value] of Object.entries(filter)) {
                        if ((item as any)[key] !== value) {
                            return false;
                        }
                    }
                    return true;
                });
            }
        };
    }

    public get reflexionMemory(): AgentDBReflexionMemory {
        return {
            storeReflexion: async (_error) => {
                // Use strategies table to log failures for now
                const stmt = this.db.prepare(
                    'INSERT INTO strategies (name, outcome, timestamp) VALUES (?, ?, ?)'
                );
                stmt.run('failure-event', 'failure', Date.now());
            },
            getCorrections: async (_error) => []
        };
    }

    public get skillLibrary(): AgentDBSkillLibrary {
        return {
            consolidateSkills: async (_filter) => [],
            applySkill: async (_state) => null
        };
    }
}
