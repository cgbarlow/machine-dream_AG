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
  LLMMove,
  MoveValidation,
  LearningContext,
} from './types.js';
import { LMStudioClient } from './LMStudioClient.js';
import { PromptBuilder } from './PromptBuilder.js';
import { ResponseParser } from './ResponseParser.js';
import { MoveValidator } from './MoveValidator.js';
import { ExperienceStore } from './ExperienceStore.js';
import { buildSystemPrompt, type SystemPromptOptions } from './config.js';
import type { AgentMemory } from '../memory/AgentMemory.js';
import { calculateImportance, calculateContext } from './ImportanceCalculator.js';

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
  private agentMemory: AgentMemory;

  private streamingEnabled = false;
  private useReasoningTemplate = false;

  constructor(
    private config: LLMConfig,
    _agentMemory: AgentMemory,
    private profileName: string = 'default',
    private learningUnitId: string = 'default'
  ) {
    super();
    this.client = new LMStudioClient(config);
    this.promptBuilder = new PromptBuilder(config.includeReasoning);
    this.responseParser = new ResponseParser();
    this.validator = new MoveValidator();
    this.experienceStore = new ExperienceStore(_agentMemory, config, profileName);
    this.agentMemory = _agentMemory;
  }

  /**
   * Enable streaming output
   */
  enableStreaming(enabled: boolean): void {
    this.streamingEnabled = enabled;
  }

  /**
   * Enable reasoning template mode
   *
   * When enabled, uses a structured constraint-intersection format
   * that enforces mathematical set notation instead of prose.
   * This has shown to improve accuracy by focusing on pure constraint math.
   */
  enableReasoningTemplate(enabled: boolean): void {
    this.useReasoningTemplate = enabled;
  }

  /**
   * Enable anonymous pattern mode
   *
   * When enabled, uses anonymous constraint-based patterns instead of
   * named strategies in the prompt. This mode has shown to improve
   * accuracy (62.5% vs 26-39% with named strategies) by:
   * - Removing strategy name overhead
   * - Focusing on situation-action-template format
   * - No YES/NO evaluation instructions
   */
  enableAnonymousPatterns(enabled: boolean): void {
    this.promptBuilder.setAnonymousPatternMode(enabled);
  }

  /**
   * Play a puzzle using pure LLM reasoning
   *
   * Spec 11 - Play Loop Algorithm + Profile-Specific Learning
   */
  async playPuzzle(
    puzzleId: string,
    initialGrid: number[][],
    solution: number[][],
    maxMoves = 200,
    useLearning = true
  ): Promise<PlaySession> {
    // Load few-shot examples only if memory enabled AND learning enabled
    const fewShots = (this.config.memoryEnabled && useLearning)
      ? await this.experienceStore.getFewShots(this.profileName, this.learningUnitId)
      : [];

    // Capture learning context at session start
    const learningContext = await this.captureLearningContext(fewShots, useLearning);

    const session = this.initSession(puzzleId, learningContext);
    let gridState = this.cloneGrid(initialGrid);

    // Track consecutive errors for breakthrough detection
    let recentErrorCount = 0;

    // Track consecutive forbidden move attempts to prevent infinite loops
    // If LLM keeps proposing the same forbidden moves, we abandon
    let consecutiveForbiddenCount = 0;
    const MAX_CONSECUTIVE_FORBIDDEN = 10;

    while (!this.validator.isSolved(gridState) && !session.abandoned) {
      // Check max moves limit
      if (session.totalMoves >= maxMoves) {
        session.abandoned = true;
        session.abandonReason = 'max_moves';
        this.emit('session:abandoned', { session, reason: 'max_moves' });
        break;
      }

      // 1. Build prompt (limit move history if configured)
      const experiencesToShow = this.config.maxHistoryMoves > 0
        ? session.experiences.slice(-this.config.maxHistoryMoves)
        : session.experiences;

      // CRITICAL FIX (Spec 11 - 2026-01-11): Pass full session.experiences for forbidden list
      // The forbidden list must use ALL experiences to prevent old forbidden moves from being
      // "forgotten" when move history is truncated. Otherwise, LLM can re-propose moves that
      // were proven wrong 20+ moves ago.
      const prompt = this.promptBuilder.buildPrompt(
        gridState,
        experiencesToShow,
        fewShots,
        session.experiences,  // Full history for forbidden list
        this.config.profileSystemPrompt  // Per-profile system prompt (Spec 13)
      );

      // 2. Call LLM (use dynamic system prompt based on grid size)
      const gridSize = gridState.length;
      const promptOptions: SystemPromptOptions = {
        useReasoningTemplate: this.useReasoningTemplate,
      };
      const messages: ChatMessage[] = [
        { role: 'system', content: buildSystemPrompt(gridSize, promptOptions) },
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
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.emit('llm:error', { error });
        session.abandoned = true;
        session.abandonReason = `llm_error: ${errorMsg}`;
        break;
      }

      // 3. Parse response (pass grid size for validation)
      const parsed = this.responseParser.parse(rawResponse, gridSize);

      if (!parsed.parseSuccess) {
        // Malformed response - record as experience per Spec 11
        this.emit('llm:parse_failure', {
          error: parsed.parseError,
          rawResponse
        });

        // Record parse failure as an experience (include prompt for debugging)
        const failureExperience = this.recordParseFailure(
          session.id,
          puzzleId,
          session.totalMoves + 1,
          gridState,
          rawResponse,
          parsed.parseError || 'Unknown parse error',
          recentErrorCount,
          learningContext,
          prompt
        );

        session.experiences.push(failureExperience);
        session.totalMoves++;
        session.invalidMoves++;
        recentErrorCount++; // Count parse failure as error

        // Persist experience if memory enabled
        if (this.config.memoryEnabled) {
          await this.experienceStore.save(failureExperience);
          this.emit('llm:experience_stored', { experience: failureExperience });
        }

        continue;
      }

      this.emit('llm:move_proposed', { move: parsed.move });

      // 3.5. Check if move is in forbidden list (prevent LLM from ignoring instructions)
      const moveKey = `(${parsed.move.row},${parsed.move.col})=${parsed.move.value}`;
      const isForbidden = session.experiences.some(exp => {
        const expKey = `(${exp.move.row},${exp.move.col})=${exp.move.value}`;
        return expKey === moveKey && (exp.validation.outcome === 'invalid' || exp.validation.outcome === 'valid_but_wrong');
      });

      let validation: MoveValidation;
      if (isForbidden) {
        // Reject forbidden move immediately without validating
        validation = {
          isValid: false,
          isCorrect: false,
          outcome: 'invalid',
          error: 'This move was already attempted and proven wrong (FORBIDDEN)',
        };
        consecutiveForbiddenCount++;
        this.emit('llm:forbidden_move_rejected', {
          move: parsed.move,
          consecutiveCount: consecutiveForbiddenCount
        });

        // Check if we've hit the consecutive forbidden limit
        if (consecutiveForbiddenCount >= MAX_CONSECUTIVE_FORBIDDEN) {
          session.abandoned = true;
          session.abandonReason = `consecutive_forbidden: LLM proposed ${consecutiveForbiddenCount} forbidden moves in a row`;
          this.emit('session:abandoned', {
            session,
            reason: 'consecutive_forbidden',
            count: consecutiveForbiddenCount
          });
          break;
        }
      } else {
        // Non-forbidden move - reset the consecutive counter
        consecutiveForbiddenCount = 0;

        // 4. Validate move normally
        validation = this.validator.validate(
          gridState,
          parsed.move,
          solution
        );
      }

      // 5. Record experience (include prompt for debugging/analysis)
      const experience = this.createExperience(
        session.id,
        puzzleId,
        session.totalMoves + 1,
        gridState,
        parsed.move,
        validation,
        recentErrorCount,
        learningContext,
        prompt
      );

      session.experiences.push(experience);
      session.totalMoves++;

      this.emit('llm:move_validated', { experience });

      // 6. Update state ONLY if correct
      // FIX: Don't apply valid-but-wrong moves - they corrupt the grid state
      if (validation.isCorrect) {
        gridState = this.applyMove(gridState, parsed.move);
        session.correctMoves++;
        recentErrorCount = 0; // Reset on success
      } else if (validation.isValid) {
        // Valid but wrong - don't apply, let LLM try again
        session.validButWrongMoves++;
        recentErrorCount++; // Count as error
      } else {
        // Invalid - rule violation
        session.invalidMoves++;
        recentErrorCount++; // Count as error
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
   * Capture learning context at session start
   * Queries memory to determine what learning features are available
   * Spec 11: Profile-Specific Learning
   */
  private async captureLearningContext(fewShots: any[], useLearning: boolean): Promise<LearningContext> {
    let consolidatedExperiences = 0;

    if (this.config.memoryEnabled && useLearning) {
      try {
        // Query consolidated experiences count for this profile
        const allExperiences = await this.agentMemory.reasoningBank.queryMetadata('llm_experience', {}) as any[];
        consolidatedExperiences = allExperiences.filter(
          (exp: any) => exp.consolidated === true && exp.profileName === this.profileName
        ).length;
      } catch (error) {
        // If queries fail, default to 0
        consolidatedExperiences = 0;
      }
    }

    return {
      fewShotsUsed: fewShots.length > 0 && useLearning,
      fewShotCount: fewShots.length,
      patternsAvailable: 0,  // Deprecated - always 0 (removed deterministic solver pattern queries)
      consolidatedExperiences,
    };
  }

  /**
   * Initialize play session
   */
  private initSession(puzzleId: string, learningContext: LearningContext): PlaySession {
    return {
      id: randomUUID(),
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
      profileName: this.profileName,
      learningUnitId: this.learningUnitId,
      learningContext,
    };
  }

  /**
   * Create experience record
   */
  private createExperience(
    sessionId: string,
    puzzleId: string,
    moveNumber: number,
    gridState: number[][],
    move: LLMMove,
    validation: MoveValidation,
    recentErrorCount: number,
    learningContext: LearningContext,
    prompt?: string
  ): LLMExperience {
    // Calculate importance and context (Spec 11, Spec 03)
    const importance = calculateImportance(move, validation, gridState, recentErrorCount);
    const context = calculateContext(move, gridState);

    return {
      id: randomUUID(),
      sessionId,
      puzzleId,
      puzzleHash: this.experienceStore.generatePuzzleHash(gridState),
      moveNumber,
      gridState: this.cloneGrid(gridState),
      move,
      validation,
      timestamp: new Date(),
      modelUsed: this.config.model,
      memoryWasEnabled: this.config.memoryEnabled,
      importance,
      context,
      profileName: this.profileName,
      learningContext,
      prompt,
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
    sessionId: string,
    puzzleId: string,
    moveNumber: number,
    gridState: number[][],
    rawResponse: string,
    parseError: string,
    recentErrorCount: number,
    learningContext: LearningContext,
    prompt?: string
  ): LLMExperience {
    const move: LLMMove = {
      row: 0,
      col: 0,
      value: 0,
      reasoning: `PARSE FAILURE: ${parseError}\n\nRaw response:\n${rawResponse}`,
    };

    const validation: MoveValidation = {
      isValid: false,
      isCorrect: false,
      outcome: 'invalid',
      error: `Parse failure: ${parseError}`,
    };

    // Calculate importance and context (Spec 11, Spec 03)
    const importance = calculateImportance(move, validation, gridState, recentErrorCount);
    const context = calculateContext(move, gridState);

    return {
      id: randomUUID(),
      sessionId,
      puzzleId,
      puzzleHash: this.experienceStore.generatePuzzleHash(gridState),
      moveNumber,
      gridState: this.cloneGrid(gridState),
      move,
      validation,
      timestamp: new Date(),
      modelUsed: this.config.model,
      memoryWasEnabled: this.config.memoryEnabled,
      importance,
      context,
      profileName: this.profileName,
      learningContext,
      prompt,
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
   * Verify that the expected model is loaded
   */
  async verifyModel() {
    return this.client.verifyModel();
  }

  /**
   * Get statistics
   */
  async getStats() {
    return this.experienceStore.getStats();
  }
}
