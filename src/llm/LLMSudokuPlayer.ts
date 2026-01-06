/**
 * LLM Sudoku Player - Main orchestration class
 * Specification: docs/specs/11-llm-sudoku-player.md
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type {
  LLMConfig,
  PlaySession,
  LLMExperience,
  ChatMessage,
} from './types.js';
import { LMStudioClient } from './LMStudioClient.js';
import { PromptBuilder } from './PromptBuilder.js';
import { ResponseParser } from './ResponseParser.js';
import { MoveValidator } from './MoveValidator.js';
import { ExperienceStore } from './ExperienceStore.js';
import { SYSTEM_PROMPT } from './config.js';
import type { AgentMemory } from '../memory/AgentMemory.js';

/**
 * LLM Sudoku Player
 *
 * Spec 11: Pure LLM-based Sudoku solving
 * - No deterministic fallback
 * - No hints
 * - Learning through experience
 * - Memory toggle for A/B testing
 */
export class LLMSudokuPlayer extends EventEmitter {
  private client: LMStudioClient;
  private promptBuilder: PromptBuilder;
  private responseParser: ResponseParser;
  private validator: MoveValidator;
  private experienceStore: ExperienceStore;

  constructor(
    private config: LLMConfig,
    private agentMemory: AgentMemory
  ) {
    super();
    this.client = new LMStudioClient(config);
    this.promptBuilder = new PromptBuilder();
    this.responseParser = new ResponseParser();
    this.validator = new MoveValidator();
    this.experienceStore = new ExperienceStore(agentMemory, config);
  }

  /**
   * Play a puzzle using pure LLM reasoning
   *
   * Spec 11 - Play Loop Algorithm
   */
  async playPuzzle(
    puzzleId: string,
    initialGrid: number[][],
    solution: number[][],
    maxMoves = 200
  ): Promise<PlaySession> {
    const session = this.initSession(puzzleId);
    let gridState = this.cloneGrid(initialGrid);

    // Load few-shot examples if memory enabled
    const fewShots = this.config.memoryEnabled
      ? await this.experienceStore.getFewShots()
      : [];

    while (!this.validator.isSolved(gridState) && !session.abandoned) {
      // Check max moves limit
      if (session.totalMoves >= maxMoves) {
        session.abandoned = true;
        this.emit('session:abandoned', { session, reason: 'max_moves' });
        break;
      }

      // 1. Build prompt
      const prompt = this.promptBuilder.buildPrompt(
        gridState,
        session.experiences,
        fewShots
      );

      // 2. Call LLM
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      let rawResponse: string;
      try {
        rawResponse = await this.client.chat(messages);
        this.emit('llm:response', { rawResponse });
      } catch (error) {
        this.emit('llm:error', { error });
        session.abandoned = true;
        break;
      }

      // 3. Parse response
      const parsed = this.responseParser.parse(rawResponse);

      if (!parsed.parseSuccess) {
        // Malformed response - record and continue
        this.emit('llm:parse_failure', { error: parsed.parseError });
        session.totalMoves++;
        continue;
      }

      this.emit('llm:move_proposed', { move: parsed.move });

      // 4. Validate move
      const validation = this.validator.validate(
        gridState,
        parsed.move,
        solution
      );

      // 5. Record experience
      const experience = this.createExperience(
        puzzleId,
        session.totalMoves + 1,
        gridState,
        parsed.move,
        validation
      );

      session.experiences.push(experience);
      session.totalMoves++;

      this.emit('llm:move_validated', { experience });

      // 6. Update state if valid
      if (validation.isValid) {
        gridState = this.applyMove(gridState, parsed.move);

        if (validation.isCorrect) {
          session.correctMoves++;
        } else {
          session.validButWrongMoves++;
        }
      } else {
        session.invalidMoves++;
      }

      // 7. Persist experience if memory enabled
      if (this.config.memoryEnabled) {
        await this.experienceStore.save(experience);
        this.emit('llm:experience_stored', { experience });
      }
    }

    session.endTime = new Date();
    session.solved = this.validator.isSolved(gridState);

    this.emit('session:complete', { session });

    return session;
  }

  /**
   * Initialize play session
   */
  private initSession(puzzleId: string): PlaySession {
    return {
      puzzleId,
      startTime: new Date(),
      solved: false,
      abandoned: false,
      totalMoves: 0,
      correctMoves: 0,
      invalidMoves: 0,
      validButWrongMoves: 0,
      experiences: [],
      memoryWasEnabled: this.config.memoryEnabled,
    };
  }

  /**
   * Create experience record
   */
  private createExperience(
    puzzleId: string,
    moveNumber: number,
    gridState: number[][],
    move: any,
    validation: any
  ): LLMExperience {
    return {
      id: randomUUID(),
      puzzleId,
      puzzleHash: this.experienceStore.generatePuzzleHash(gridState),
      moveNumber,
      gridState: this.cloneGrid(gridState),
      move,
      validation,
      timestamp: new Date(),
      modelUsed: this.config.model,
      memoryWasEnabled: this.config.memoryEnabled,
    };
  }

  /**
   * Apply move to grid (immutable)
   */
  private applyMove(grid: number[][], move: any): number[][] {
    const newGrid = this.cloneGrid(grid);
    newGrid[move.row - 1][move.col - 1] = move.value;
    return newGrid;
  }

  /**
   * Clone grid
   */
  private cloneGrid(grid: number[][]): number[][] {
    return grid.map((row) => [...row]);
  }

  /**
   * Health check LM Studio connection
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }

  /**
   * Get loaded model info
   */
  async getModelInfo() {
    return this.client.getModelInfo();
  }

  /**
   * Get statistics
   */
  async getStats() {
    return this.experienceStore.getStats();
  }
}
