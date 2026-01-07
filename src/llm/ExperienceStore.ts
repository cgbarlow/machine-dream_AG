/**
 * Experience Store - Persists LLM experiences to AgentDB
 * Specification: docs/specs/11-llm-sudoku-player.md, docs/specs/08-agentdb-integration-spec.md
 */

import type {
  LLMExperience,
  FewShotExample,
  LLMConfig,
} from './types.js';
import type { AgentMemory } from '../memory/AgentMemory.js';
import { createHash } from 'crypto';

/**
 * Experience Store
 *
 * Spec 11 + Spec 08 Appendix D: Stores LLM experiences in AgentDB
 * - Saves experiences to ReasoningBank
 * - Tracks few-shot examples
 * - Supports consolidation marking
 */
export class ExperienceStore {
  constructor(
    private agentMemory: AgentMemory,
    private config: LLMConfig
  ) {}

  /**
   * Save LLM experience to AgentDB
   *
   * Spec 08 Appendix D: Store as reasoning trajectory
   */
  async save(experience: LLMExperience): Promise<void> {
    if (!this.config.memoryEnabled) {
      // Memory disabled - don't persist
      return;
    }

    // Store in ReasoningBank
    await this.agentMemory.reasoningBank.storeReasoning({
      trajectory_id: experience.puzzleId,
      step_index: experience.moveNumber,
      action: JSON.stringify({
        row: experience.move.row,
        col: experience.move.col,
        value: experience.move.value,
      }),
      reasoning: experience.move.reasoning,
      outcome: experience.validation.isCorrect ? 'success' : 'failure',
      feedback: experience.validation.error || 'Move validated',
    });

    // Store full experience as metadata
    await this.agentMemory.reasoningBank.storeMetadata(
      experience.id,
      'llm_experience',
      {
        ...experience,
        consolidated: false,
      }
    );
  }

  /**
   * Get all experiences for a specific puzzle
   */
  async getByPuzzle(puzzleId: string): Promise<LLMExperience[]> {
    const trajectory = await this.agentMemory.reasoningBank.getTrajectory(
      puzzleId
    );

    if (!trajectory) {
      return [];
    }

    // Convert trajectory steps back to experiences
    const experiences: LLMExperience[] = [];

    for (const step of trajectory.steps) {
      const metadata = await this.agentMemory.reasoningBank.getMetadata(
        `${puzzleId}_${step.step_index}`,
        'llm_experience'
      );

      if (metadata) {
        experiences.push(metadata as LLMExperience);
      }
    }

    return experiences.sort((a, b) => a.moveNumber - b.moveNumber);
  }

  /**
   * Get unconsolidated experiences for dreaming
   */
  async getUnconsolidated(): Promise<LLMExperience[]> {
    // Query all LLM experiences that haven't been consolidated
    const allExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      'llm_experience',
      { consolidated: false }
    );

    return allExperiences as LLMExperience[];
  }

  /**
   * Mark experiences as consolidated after dreaming
   */
  async markConsolidated(experienceIds: string[]): Promise<void> {
    for (const id of experienceIds) {
      const experience = await this.agentMemory.reasoningBank.getMetadata(
        id,
        'llm_experience'
      );

      if (experience) {
        await this.agentMemory.reasoningBank.storeMetadata(
          id,
          'llm_experience',
          {
            ...(experience as object),
            consolidated: true,
          }
        );
      }
    }
  }

  /**
   * Save few-shot examples from consolidation
   */
  async saveFewShots(examples: FewShotExample[]): Promise<void> {
    await this.agentMemory.reasoningBank.storeMetadata(
      'llm_fewshots',
      'fewshot_examples',
      {
        examples,
        updated: new Date(),
      }
    );
  }

  /**
   * Get few-shot examples for prompts
   */
  async getFewShots(limit = 5): Promise<FewShotExample[]> {
    const data = await this.agentMemory.reasoningBank.getMetadata(
      'llm_fewshots',
      'fewshot_examples'
    );

    if (!data || !Array.isArray((data as any).examples)) {
      return [];
    }

    return (data as any).examples.slice(0, limit);
  }

  /**
   * Generate puzzle hash for similarity detection
   */
  generatePuzzleHash(gridState: number[][]): string {
    const gridString = gridState.map((row) => row.join('')).join('');
    return createHash('sha256').update(gridString).digest('hex').substring(0, 16);
  }

  /**
   * Get aggregate statistics
   */
  async getStats(): Promise<{
    totalExperiences: number;
    totalPuzzles: number;
    correctMoves: number;
    invalidMoves: number;
    validButWrongMoves: number;
  }> {
    const allExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      'llm_experience',
      {}
    ) as LLMExperience[];

    const uniquePuzzles = new Set(
      allExperiences.map((exp) => exp.puzzleId)
    ).size;

    const correct = allExperiences.filter(
      (exp) => exp.validation.outcome === 'correct'
    ).length;

    const invalid = allExperiences.filter(
      (exp) => exp.validation.outcome === 'invalid'
    ).length;

    const validButWrong = allExperiences.filter(
      (exp) => exp.validation.outcome === 'valid_but_wrong'
    ).length;

    return {
      totalExperiences: allExperiences.length,
      totalPuzzles: uniquePuzzles,
      correctMoves: correct,
      invalidMoves: invalid,
      validButWrongMoves: validButWrong,
    };
  }
}
