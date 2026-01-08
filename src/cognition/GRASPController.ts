
import {
    PuzzleState,
    Move,
    ValidationResult
} from '../types.js';
import { AgentMemory } from '../memory/AgentMemory.js';
import { PuzzleBoard } from '../engine/PuzzleBoard.js';
import { AttentionManager } from './AttentionManager.js';
import { StrategyEngine } from './StrategyEngine.js';

export class GRASPController {
    private memory: AgentMemory;
    private attention: AttentionManager;
    private strategyEngine: StrategyEngine;
    private board: PuzzleBoard; // Current board instance

    constructor(memory: AgentMemory, board: PuzzleBoard) {
        this.memory = memory;
        this.board = board;
        this.attention = new AttentionManager();
        this.strategyEngine = new StrategyEngine();
    }

    /**
     * Executes one full iteration of the GRASP loop.
     */
    public async executeIteration(): Promise<ValidationResult> {
        const currentState = this.board.getState();

        // 0. Focus Selection (from Attention Mechanism)
        const focusCell = this.attention.selectFocus(currentState);

        // 1. GENERATE
        const candidates = await this.generatePhase(currentState, focusCell);

        // 2. REVIEW
        const selectedMove = await this.reviewPhase(candidates, currentState);

        // Apply move to board to get actual result/validation
        const result = this.board.placeValue(selectedMove.cell, selectedMove.value);

        // 3. ABSORB
        await this.absorbPhase(selectedMove, result);

        // 4. SYNTHESIZE
        await this.synthesizePhase(currentState);

        // 5. PERSIST (Managed by caller/loop, but we update internal state)
        this.attention.updateProgress(selectedMove, result);

        return result;
    }

    private async generatePhase(state: PuzzleState, focus: { row: number, col: number }): Promise<Move[]> {
        // Phase 1: Use Strategy Engine to find logical moves
        const logicalMoves = this.strategyEngine.generateMoves(state);

        // Filter moves relevant to focus area if we want strict attention
        // For now, return all discovered logical moves as they are high value
        if (logicalMoves.length > 0) {
            return logicalMoves;
        }

        // HEURISTIC FALLBACK:
        // If no strategies found moves, fallback to intelligent guessing on the focus cell
        // We only try possibilities that are candidates
        const moves: Move[] = [];
        for (let v = 1; v <= 9; v++) { // In real impl, use candidates from state
            moves.push({
                cell: focus,
                value: v,
                strategy: 'guess-check',
                timestamp: Date.now()
            });
        }
        return moves;
    }

    private async reviewPhase(candidates: Move[], _state: PuzzleState): Promise<Move> {
        // HEURISTIC: Find first valid move (for now)
        // Since board.placeValue does validation, we mostly need to pick one to try.
        // Integrating with SudokuRules explicitly here would be better for "Review" 
        // but for POC, we will optimistically pick the first that looks plausible?

        // Actually, let's pick a random one or logic based.
        // For this POC, let's just pick the first one (1) and let the engine validate it.
        // A better implementation would pre-validate.

        if (candidates.length > 0) return candidates[0];

        throw new Error("No candidates generated");
    }

    private async absorbPhase(move: Move, result: ValidationResult) {
        // Log intent and outcome
        await this.memory.reasoningBank.logMove(move, result);

        if (result.outcome === 'success') {
            await this.memory.reasoningBank.logStrategy(move.strategy, result);
        }
    }

    private async synthesizePhase(_state: PuzzleState) {
        // Check for insights or patterns
        const insights = this.attention.detectInsights();
        for (const insight of insights) {
            await this.memory.reasoningBank.logInsight(insight);
        }

        // Periodic consolidation
        // await this.memory.consolidate(...)
    }
}
