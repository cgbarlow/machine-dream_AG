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

  private streamingEnabled = false;

  constructor(
    private config: LLMConfig,
    _agentMemory: AgentMemory
  ) {
    super();
    this.client = new LMStudioClient(config);
    this.promptBuilder = new PromptBuilder(config.includeReasoning);
    this.responseParser = new ResponseParser();
    this.validator = new MoveValidator();
    this.experienceStore = new ExperienceStore(_agentMemory, config);
  }

  /**
   * Enable streaming output
   */
  enableStreaming(enabled: boolean): void {
    this.streamingEnabled = enabled;
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

      // 1. Build prompt (limit move history if configured)
      const experiencesToShow = this.config.maxHistoryMoves > 0
        ? session.experiences.slice(-this.config.maxHistoryMoves)
        : session.experiences;

      const prompt = this.promptBuilder.buildPrompt(
        gridState,
        experiencesToShow,
        fewShots
      );

      // 2. Call LLM
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      this.emit('llm:request', { messages, prompt });

      let rawResponse: string;
      try {
        if (this.streamingEnabled) {
          // Stream tokens as they arrive
          rawResponse = await this.client.chat(messages, (token: string) => {
            this.emit('llm:stream', { token });
          });
        } else {
          // Wait for complete response
          rawResponse = await this.client.chat(messages);
        }
        this.emit('llm:response', { rawResponse });
      } catch (error) {
        this.emit('llm:error', { error });
        session.abandoned = true;
        break;
      }

      // 3. Parse response
      const parsed = this.responseParser.parse(rawResponse);

      if (!parsed.parseSuccess) {
        // Malformed response - record as experience per Spec 11
        this.emit('llm:parse_failure', {
          error: parsed.parseError,
          rawResponse
        });

        // Record parse failure as an experience
        const failureExperience = this.recordParseFailure(
          puzzleId,
          session.totalMoves + 1,
          gridState,
          rawResponse,
          parsed.parseError || 'Unknown parse error'
        );

        session.experiences.push(failureExperience);
        session.totalMoves++;
        session.invalidMoves++;

        // Persist experience if memory enabled
        if (this.config.memoryEnabled) {
          await this.experienceStore.save(failureExperience);
          this.emit('llm:experience_stored', { experience: failureExperience });
        }

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

      // 6. Update state ONLY if correct
      // FIX: Don't apply valid-but-wrong moves - they corrupt the grid state
      if (validation.isCorrect) {
        gridState = this.applyMove(gridState, parsed.move);
        session.correctMoves++;
      } else if (validation.isValid) {
        // Valid but wrong - don't apply, let LLM try again
        session.validButWrongMoves++;
      } else {
        // Invalid - rule violation
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
   * Record parse failure as an experience
   * Spec 11: Parse failures should be tracked for learning
   */
  private recordParseFailure(
    puzzleId: string,
    moveNumber: number,
    gridState: number[][],
    rawResponse: string,
    parseError: string
  ): LLMExperience {
    return {
      id: randomUUID(),
      puzzleId,
      puzzleHash: this.experienceStore.generatePuzzleHash(gridState),
      moveNumber,
      gridState: this.cloneGrid(gridState),
      move: {
        row: 0,
        col: 0,
        value: 0,
        reasoning: `PARSE FAILURE: ${parseError}\n\nRaw response:\n${rawResponse}`,
      },
      validation: {
        isValid: false,
        isCorrect: false,
        outcome: 'invalid',
        error: `Parse failure: ${parseError}`,
      },
      timestamp: new Date(),
      modelUsed: this.config.model,
      memoryWasEnabled: this.config.memoryEnabled,
    };
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
