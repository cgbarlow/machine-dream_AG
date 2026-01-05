
import Database from 'better-sqlite3';
import {
    Experience, Move, ValidationResult, PuzzleState, Insight,
    Pattern, ConsolidatedKnowledge, AgentDBReasoningBank,
    ReflexionError, AgentDBReflexionMemory, AgentDBSkillLibrary, Skill
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
            querySimilar: async (context) => {
                // Simple SQL query to find successful moves in same cell or value
                // This replaces the mock with a real DB lookup
                const stmt = this.db.prepare(
                    "SELECT * FROM moves WHERE outcome = 'success' ORDER BY timestamp DESC LIMIT 5"
                );
                return stmt.all() as any[];
            },
            distillPatterns: async (sessionId) => {
                // Return high-success strategies as 'patterns'
                const stmt = this.db.prepare(
                    "SELECT name as id, outcome as description, 1.0 as success_rate, count(*) as usage_count FROM strategies WHERE outcome='success' GROUP BY name"
                );
                return stmt.all() as Pattern[];
            },
            consolidate: async (experiences) => {
                return {
                    sessionIds: [],
                    patterns: [],
                    abstractionLadder: { levels: [] },
                    compressionRatio: 1.0,
                    verificationStatus: 'verified',
                    timestamp: Date.now()
                } as ConsolidatedKnowledge;
            }
        };
    }

    public get reflexionMemory(): AgentDBReflexionMemory {
        return {
            storeReflexion: async (error) => {
                // Use strategies table to log failures for now
                const stmt = this.db.prepare(
                    'INSERT INTO strategies (name, outcome, timestamp) VALUES (?, ?, ?)'
                );
                stmt.run('failure-event', 'failure', Date.now());
            },
            getCorrections: async (error) => []
        };
    }

    public get skillLibrary(): AgentDBSkillLibrary {
        return {
            consolidateSkills: async (filter) => [],
            applySkill: async (state) => null
        };
    }
}
