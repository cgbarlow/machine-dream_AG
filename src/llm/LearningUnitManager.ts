/**
 * Learning Unit Manager - CRUD operations for learning units
 * Specification: docs/specs/11-llm-sudoku-player.md - Learning Units section
 *
 * Manages discrete packages of consolidated knowledge that can be:
 * - Created and named for different training focuses
 * - Updated iteratively as new experiences are absorbed
 * - Merged to combine knowledge from multiple training runs
 * - Exported/imported for sharing between installations
 */

import type { AgentMemory } from '../memory/AgentMemory.js';
import type {
  LearningUnit,
  LearningUnitSummary,
  FewShotExample,
  AbstractionHierarchy,
  SynthesizedAntiPattern,
  ReasoningCorrection,
  LLMExperience,
} from './types.js';
import { DEFAULT_LEARNING_UNIT_ID } from './types.js';
import { LLM_STORAGE_KEYS } from './storage-keys.js';
import { AlgorithmRegistry } from './clustering/AlgorithmRegistry.js';

/**
 * Learning Unit Manager
 *
 * Provides CRUD operations for learning units, enabling:
 * - Multiple learning tracks per profile
 * - Iterative knowledge absorption
 * - Unit merging and distillation
 * - Export/import capabilities
 */
export class LearningUnitManager {
  constructor(
    private agentMemory: AgentMemory,
    private profileName: string
  ) {}

  /**
   * Create a new learning unit
   * @param id - Unique identifier within profile
   * @param name - Display name
   * @param description - Optional description
   * @returns The created learning unit
   */
  async create(id: string, name: string, description?: string): Promise<LearningUnit> {
    // Check if unit already exists
    const existing = await this.get(id);
    if (existing) {
      throw new Error(`Learning unit '${id}' already exists for profile '${this.profileName}'`);
    }

    const now = new Date();
    const unit: LearningUnit = {
      id,
      profileName: this.profileName,
      name,
      description,
      createdAt: now,
      lastUpdatedAt: now,
      fewShots: [],
      absorbedExperienceIds: [],
      metadata: {
        totalExperiences: 0,
        puzzleBreakdown: {},
        version: 1,
      },
    };

    await this.saveUnitMetadata(unit);
    return unit;
  }

  /**
   * Get a learning unit by ID
   * @param id - Learning unit ID
   * @returns The learning unit or null if not found
   */
  async get(id: string): Promise<LearningUnit | null> {
    const key = LLM_STORAGE_KEYS.getLearningUnitKey(this.profileName, id);
    const metadata = await this.agentMemory.reasoningBank.getMetadata(
      key,
      LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE
    );

    if (!metadata) {
      // Try mapping legacy unit name (Spec 18: Algorithm Versioning)
      const registry = AlgorithmRegistry.getInstance();
      const mappedId = registry.mapLegacyUnit(id);

      if (mappedId !== id) {
        console.log(`📦 Mapping legacy unit "${id}" → "${mappedId}"`);
        const mappedKey = LLM_STORAGE_KEYS.getLearningUnitKey(this.profileName, mappedId);
        const mappedMetadata = await this.agentMemory.reasoningBank.getMetadata(
          mappedKey,
          LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE
        );

        if (mappedMetadata) {
          // Recursively call get() with mapped ID to avoid code duplication
          return this.get(mappedId);
        }
      }

      // Check for legacy few-shots without explicit learning unit
      if (id === DEFAULT_LEARNING_UNIT_ID) {
        return this.getOrCreateDefaultUnit();
      }
      return null;
    }

    // Load few-shots separately
    const fewShots = await this.getFewShots(id);
    const hierarchy = await this.getHierarchy(id);

    // Convert stored metadata back to proper types
    const storedMeta = metadata as any;
    const lastConsolidationAt = storedMeta.metadata?.lastConsolidationAt
      ? new Date(storedMeta.metadata.lastConsolidationAt)
      : undefined;

    return {
      ...storedMeta,
      fewShots,
      hierarchy,
      // Ensure dates are Date objects
      createdAt: new Date(storedMeta.createdAt),
      lastUpdatedAt: new Date(storedMeta.lastUpdatedAt),
      metadata: {
        ...storedMeta.metadata,
        lastConsolidationAt,
      },
    } as LearningUnit;
  }

  /**
   * List all learning units for the current profile
   * @returns Array of learning unit summaries
   */
  async list(): Promise<LearningUnitSummary[]> {
    // Query all learning unit metadata for this profile
    const allUnits = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
      {}
    ) as any[];

    // Filter by profile and map to summaries
    const profileUnits = allUnits.filter(
      (unit) => unit.profileName === this.profileName
    );

    const summaries: LearningUnitSummary[] = [];
    for (const unit of profileUnits) {
      const fewShots = await this.getFewShots(unit.id);
      summaries.push({
        id: unit.id,
        profileName: unit.profileName,
        name: unit.name,
        description: unit.description,
        createdAt: new Date(unit.createdAt),
        lastUpdatedAt: new Date(unit.lastUpdatedAt),
        strategyCount: fewShots.length,
        experienceCount: unit.metadata?.totalExperiences || 0,
      });
    }

    // Check for legacy few-shots that should be in default unit
    const hasDefault = summaries.some((s) => s.id === DEFAULT_LEARNING_UNIT_ID);
    if (!hasDefault) {
      const legacyFewShots = await this.getLegacyFewShots();
      if (legacyFewShots.length > 0) {
        // Create default unit from legacy data
        const defaultUnit = await this.getOrCreateDefaultUnit();
        if (defaultUnit) {
          summaries.push({
            id: defaultUnit.id,
            profileName: defaultUnit.profileName,
            name: defaultUnit.name,
            description: defaultUnit.description,
            createdAt: defaultUnit.createdAt,
            lastUpdatedAt: defaultUnit.lastUpdatedAt,
            strategyCount: defaultUnit.fewShots.length,
            experienceCount: defaultUnit.metadata.totalExperiences,
          });
        }
      }
    }

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Delete a learning unit
   * @param id - Learning unit ID
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.get(id);
    if (!existing) {
      return false;
    }

    // Delete metadata
    const metaKey = LLM_STORAGE_KEYS.getLearningUnitKey(this.profileName, id);
    await this.agentMemory.reasoningBank.deleteMetadata(metaKey, LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE);

    // Delete few-shots
    const fewShotsKey = LLM_STORAGE_KEYS.getFewShotsKey(this.profileName, id);
    await this.agentMemory.reasoningBank.deleteMetadata(fewShotsKey, LLM_STORAGE_KEYS.FEWSHOTS_TYPE);

    // Delete hierarchy
    await this.agentMemory.reasoningBank.deleteMetadata(
      `llm_hierarchy:${this.profileName}:${id}`,
      'abstraction_hierarchy'
    );

    // Delete anti-patterns (Spec 19)
    const antiPatternsKey = LLM_STORAGE_KEYS.getAntiPatternsKey(this.profileName, id);
    await this.agentMemory.reasoningBank.deleteMetadata(antiPatternsKey, LLM_STORAGE_KEYS.ANTIPATTERNS_TYPE);

    // Delete reasoning corrections (Spec 19)
    const correctionsKey = LLM_STORAGE_KEYS.getCorrectionsKey(this.profileName, id);
    await this.agentMemory.reasoningBank.deleteMetadata(correctionsKey, LLM_STORAGE_KEYS.CORRECTIONS_TYPE);

    // NEW: Delete unit-bound experiences (Sticky Experience Model)
    await this.deleteUnitExperiences(id);

    return true;
  }

  /**
   * Delete all unit-bound experiences for a learning unit (Sticky Experience Model)
   *
   * This only deletes unit-specific copies. Global experiences in llm_experience
   * are NOT affected - they remain available for other units or future use.
   *
   * @param unitId - Learning unit ID
   * @returns Number of experiences deleted
   */
  async deleteUnitExperiences(unitId: string): Promise<number> {
    // Query all experiences bound to this unit
    const unitExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
      { boundToUnit: unitId }
    ) as any[];

    let deletedCount = 0;
    for (const exp of unitExperiences) {
      try {
        const key = LLM_STORAGE_KEYS.getUnitExperienceKey(unitId, exp.id);
        const deleted = await this.agentMemory.reasoningBank.deleteMetadata(
          key,
          LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE
        );
        if (deleted) {
          deletedCount++;
        }
      } catch {
        // Continue on error
      }
    }

    return deletedCount;
  }

  /**
   * Get few-shot examples from a learning unit
   * @param unitId - Learning unit ID
   * @param limit - Maximum number to return
   * @returns Array of few-shot examples
   */
  async getFewShots(unitId: string, limit?: number): Promise<FewShotExample[]> {
    const key = LLM_STORAGE_KEYS.getFewShotsKey(this.profileName, unitId);
    const data = await this.agentMemory.reasoningBank.getMetadata(
      key,
      LLM_STORAGE_KEYS.FEWSHOTS_TYPE
    );

    if (!data || !Array.isArray((data as any).examples)) {
      return [];
    }

    const examples = (data as any).examples as FewShotExample[];
    return limit ? examples.slice(0, limit) : examples;
  }

  /**
   * Save few-shot examples to a learning unit
   * @param unitId - Learning unit ID
   * @param examples - Few-shot examples to save
   */
  async saveFewShots(unitId: string, examples: FewShotExample[]): Promise<void> {
    const key = LLM_STORAGE_KEYS.getFewShotsKey(this.profileName, unitId);
    await this.agentMemory.reasoningBank.storeMetadata(
      key,
      LLM_STORAGE_KEYS.FEWSHOTS_TYPE,
      {
        examples,
        updated: new Date(),
        profileName: this.profileName,
        learningUnitId: unitId,
      }
    );

    // Update unit metadata
    await this.updateUnitTimestamp(unitId);
  }

  /**
   * Increment playCount for a strategy based on matching reasoning
   * Spec 05 Section 8.5: Strategy usage tracking
   *
   * @param unitId - Learning unit ID
   * @param reasoning - The reasoning text from the successful move
   * @returns The matched strategy name or null if no match found
   */
  async incrementStrategyPlayCount(unitId: string, reasoning: string): Promise<string | null> {
    const fewShots = await this.getFewShots(unitId);
    if (fewShots.length === 0) return null;

    // Find best matching strategy using keyword/phrase matching
    const matchedStrategy = this.findBestMatchingStrategy(fewShots, reasoning);
    if (!matchedStrategy) return null;

    // Increment playCount
    matchedStrategy.playCount = (matchedStrategy.playCount || 0) + 1;

    // Save updated few-shots
    await this.saveFewShots(unitId, fewShots);

    return matchedStrategy.friendlyName || matchedStrategy.strategy || 'Unknown Strategy';
  }

  /**
   * Find the best matching strategy based on reasoning similarity
   * Uses keyword matching from strategy's situation/analysis
   */
  private findBestMatchingStrategy(
    fewShots: FewShotExample[],
    reasoning: string
  ): FewShotExample | null {
    const reasoningLower = reasoning.toLowerCase();
    let bestMatch: { strategy: FewShotExample; score: number } | null = null;

    for (const fs of fewShots) {
      let score = 0;

      // Match against situation keywords
      if (fs.situation) {
        const situationWords = fs.situation.toLowerCase().split(/\s+/);
        for (const word of situationWords) {
          if (word.length > 3 && reasoningLower.includes(word)) {
            score += 1;
          }
        }
      }

      // Match against analysis/reasoning steps
      if (fs.analysis) {
        const analysisWords = fs.analysis.toLowerCase().split(/\s+/);
        for (const word of analysisWords) {
          if (word.length > 3 && reasoningLower.includes(word)) {
            score += 0.5;
          }
        }
      }

      // Match against strategy name
      if (fs.strategy) {
        const strategyWords = fs.strategy.toLowerCase().split(/[_\s]+/);
        for (const word of strategyWords) {
          if (word.length > 2 && reasoningLower.includes(word)) {
            score += 2;
          }
        }
      }

      // Keep best match (minimum score of 3 required)
      if (score >= 3 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { strategy: fs, score };
      }
    }

    return bestMatch?.strategy || null;
  }

  /**
   * Get abstraction hierarchy from a learning unit
   * @param unitId - Learning unit ID
   * @returns Abstraction hierarchy or null
   */
  async getHierarchy(unitId: string): Promise<AbstractionHierarchy | null> {
    const key = `llm_hierarchy:${this.profileName}:${unitId}`;
    const data = await this.agentMemory.reasoningBank.getMetadata(
      key,
      'abstraction_hierarchy'
    );
    return data as AbstractionHierarchy | null;
  }

  /**
   * Save abstraction hierarchy to a learning unit
   * @param unitId - Learning unit ID
   * @param hierarchy - Hierarchy to save
   */
  async saveHierarchy(unitId: string, hierarchy: AbstractionHierarchy): Promise<void> {
    const key = `llm_hierarchy:${this.profileName}:${unitId}`;
    await this.agentMemory.reasoningBank.storeMetadata(
      key,
      'abstraction_hierarchy',
      {
        ...hierarchy,
        profileName: this.profileName,
        learningUnitId: unitId,
      }
    );
  }

  // ============================================================================
  // Failure Learning Methods (Spec 19)
  // ============================================================================

  /**
   * Get anti-patterns from a learning unit
   * @param unitId - Learning unit ID
   * @returns Array of anti-patterns or empty array
   */
  async getAntiPatterns(unitId: string): Promise<SynthesizedAntiPattern[]> {
    const key = LLM_STORAGE_KEYS.getAntiPatternsKey(this.profileName, unitId);
    const data = await this.agentMemory.reasoningBank.getMetadata(
      key,
      LLM_STORAGE_KEYS.ANTIPATTERNS_TYPE
    );

    if (!data || !Array.isArray((data as any).antiPatterns)) {
      return [];
    }

    return (data as any).antiPatterns as SynthesizedAntiPattern[];
  }

  /**
   * Save anti-patterns to a learning unit
   * @param unitId - Learning unit ID
   * @param antiPatterns - Anti-patterns to save
   */
  async saveAntiPatterns(unitId: string, antiPatterns: SynthesizedAntiPattern[]): Promise<void> {
    const key = LLM_STORAGE_KEYS.getAntiPatternsKey(this.profileName, unitId);
    await this.agentMemory.reasoningBank.storeMetadata(
      key,
      LLM_STORAGE_KEYS.ANTIPATTERNS_TYPE,
      {
        antiPatterns,
        updated: new Date(),
        profileName: this.profileName,
        learningUnitId: unitId,
      }
    );

    // Update unit metadata
    await this.updateUnitTimestamp(unitId);
  }

  /**
   * Get reasoning corrections from a learning unit
   * @param unitId - Learning unit ID
   * @returns Array of reasoning corrections or empty array
   */
  async getReasoningCorrections(unitId: string): Promise<ReasoningCorrection[]> {
    const key = LLM_STORAGE_KEYS.getCorrectionsKey(this.profileName, unitId);
    const data = await this.agentMemory.reasoningBank.getMetadata(
      key,
      LLM_STORAGE_KEYS.CORRECTIONS_TYPE
    );

    if (!data || !Array.isArray((data as any).corrections)) {
      return [];
    }

    return (data as any).corrections as ReasoningCorrection[];
  }

  /**
   * Save reasoning corrections to a learning unit
   * @param unitId - Learning unit ID
   * @param corrections - Reasoning corrections to save
   */
  async saveReasoningCorrections(unitId: string, corrections: ReasoningCorrection[]): Promise<void> {
    const key = LLM_STORAGE_KEYS.getCorrectionsKey(this.profileName, unitId);
    await this.agentMemory.reasoningBank.storeMetadata(
      key,
      LLM_STORAGE_KEYS.CORRECTIONS_TYPE,
      {
        corrections,
        updated: new Date(),
        profileName: this.profileName,
        learningUnitId: unitId,
      }
    );

    // Update unit metadata
    await this.updateUnitTimestamp(unitId);
  }

  /**
   * Get IDs of experiences already absorbed by a learning unit
   * @param unitId - Learning unit ID
   * @returns Array of experience IDs
   */
  async getAbsorbedExperienceIds(unitId: string): Promise<string[]> {
    const unit = await this.get(unitId);
    return unit?.absorbedExperienceIds || [];
  }

  /**
   * Get all experiences bound to a learning unit (Sticky Experience Model)
   *
   * This method provides the new "sticky" experience retrieval:
   * 1. First checks unit-specific storage (new model)
   * 2. Falls back to loading from global storage via absorbedExperienceIds (legacy)
   *
   * This ensures backwards compatibility with existing data while supporting
   * the new unit-bound experience model.
   *
   * @param unitId - Learning unit ID
   * @returns Array of experiences (either unit-bound or from global storage)
   */
  async getUnitExperiences(unitId: string): Promise<LLMExperience[]> {
    // Try new model first: query unit-specific storage
    const unitExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
      { boundToUnit: unitId }
    ) as LLMExperience[];

    if (unitExperiences.length > 0) {
      return unitExperiences;
    }

    // Fall back to legacy model: load from global storage via absorbedExperienceIds
    const unit = await this.get(unitId);
    if (!unit || unit.absorbedExperienceIds.length === 0) {
      return [];
    }

    const legacyExperiences: LLMExperience[] = [];
    for (const expId of unit.absorbedExperienceIds) {
      try {
        const exp = await this.agentMemory.reasoningBank.getMetadata(
          expId,
          LLM_STORAGE_KEYS.EXPERIENCE_TYPE
        ) as LLMExperience | null;
        if (exp) {
          legacyExperiences.push(exp);
        }
      } catch {
        // Experience no longer exists
      }
    }

    return legacyExperiences;
  }

  /**
   * Get count of unit-bound experiences (new model only)
   *
   * @param unitId - Learning unit ID
   * @returns Count of unit-bound experiences, or 0 if using legacy model
   */
  async getUnitExperienceCount(unitId: string): Promise<number> {
    const unitExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
      { boundToUnit: unitId }
    ) as any[];
    return unitExperiences.length;
  }

  /**
   * Check if a unit has migrated to the new sticky experience model
   *
   * @param unitId - Learning unit ID
   * @returns true if unit has unit-bound experiences (new model)
   */
  async isUsingNewExperienceModel(unitId: string): Promise<boolean> {
    const count = await this.getUnitExperienceCount(unitId);
    return count > 0;
  }

  /**
   * Migrate a legacy unit to the new sticky experience model
   *
   * Copies all experiences from global storage to unit-specific storage.
   * This is idempotent - running on an already-migrated unit does nothing.
   *
   * @param unitId - Learning unit ID
   * @returns Number of experiences migrated, or 0 if already migrated
   */
  async migrateToNewExperienceModel(unitId: string): Promise<number> {
    // Check if already migrated
    if (await this.isUsingNewExperienceModel(unitId)) {
      return 0;
    }

    const unit = await this.get(unitId);
    if (!unit || unit.absorbedExperienceIds.length === 0) {
      return 0;
    }

    // Copy experiences to unit-specific storage
    await this.copyExperiencesByIdToUnit(unitId, unit.absorbedExperienceIds, unit.metadata.version);

    return unit.absorbedExperienceIds.length;
  }

  /**
   * Mark experiences as absorbed by a learning unit
   *
   * NEW (Sticky Experience Model): Also creates unit-bound copies of the experiences
   * in unit-specific storage. This allows:
   * - Deleting a unit only deletes its copies
   * - Unit experiences are independent from global pool
   * - Backwards compatible (legacy data still works via absorbedExperienceIds)
   *
   * @param unitId - Learning unit ID
   * @param experienceIds - Experience IDs to mark as absorbed
   * @param puzzleBreakdown - Breakdown of puzzle types absorbed
   * @param experiences - Optional: Full experience objects to copy to unit storage
   * @param options - Additional options
   * @param options.preserveOriginals - If true, keep original experiences after copying (for multi-algorithm dreaming)
   */
  async markExperiencesAbsorbed(
    unitId: string,
    experienceIds: string[],
    puzzleBreakdown?: Record<string, number>,
    experiences?: LLMExperience[],
    options: { preserveOriginals?: boolean } = {}
  ): Promise<void> {
    let unit = await this.get(unitId);
    if (!unit) {
      // Auto-create the learning unit if it doesn't exist
      unit = await this.create(unitId, unitId, `Auto-created during dream consolidation`);
    }

    // Merge experience IDs (avoid duplicates)
    const existingIds = new Set(unit.absorbedExperienceIds);
    const newIds = experienceIds.filter((id) => !existingIds.has(id));
    const allIds = [...unit.absorbedExperienceIds, ...newIds];

    // Merge puzzle breakdown
    const mergedBreakdown = { ...unit.metadata.puzzleBreakdown };
    if (puzzleBreakdown) {
      for (const [key, count] of Object.entries(puzzleBreakdown)) {
        mergedBreakdown[key] = (mergedBreakdown[key] || 0) + count;
      }
    }

    // NEW: Create unit-bound copies of experiences (Sticky Experience Model)
    // After copying, delete the originals (experiences are "consumed" by the unit)
    // Unless preserveOriginals is true (for multi-algorithm dreaming workflows)
    if (experiences && experiences.length > 0) {
      await this.copyExperiencesToUnit(unitId, experiences, unit.metadata.version + 1);
      // Delete original global experiences (1b: consumed after absorption)
      // Skip if preserveOriginals is true (enables multiple dream runs on same experiences)
      if (!options.preserveOriginals) {
        await this.deleteGlobalExperiences(experiences.map(e => e.id));
      }
    } else if (newIds.length > 0) {
      // Fallback: Load experiences from global storage and copy them
      await this.copyExperiencesByIdToUnit(unitId, newIds, unit.metadata.version + 1);
      // Delete original global experiences (1b: consumed after absorption)
      // Skip if preserveOriginals is true (enables multiple dream runs on same experiences)
      if (!options.preserveOriginals) {
        await this.deleteGlobalExperiences(newIds);
      }
    }

    // Update unit
    const updatedUnit: LearningUnit = {
      ...unit,
      absorbedExperienceIds: allIds,
      lastUpdatedAt: new Date(),
      metadata: {
        ...unit.metadata,
        totalExperiences: allIds.length,
        puzzleBreakdown: mergedBreakdown,
        lastConsolidationAt: new Date(),
        version: unit.metadata.version + 1,
      },
    };

    await this.saveUnitMetadata(updatedUnit);
  }

  /**
   * Copy experiences to unit-specific storage (Sticky Experience Model)
   *
   * Creates independent copies of experiences bound to this unit.
   * These copies are deleted when the unit is deleted.
   *
   * @param unitId - Learning unit ID
   * @param experiences - Full experience objects to copy
   * @param unitVersion - Current unit version (for tracking)
   */
  private async copyExperiencesToUnit(
    unitId: string,
    experiences: LLMExperience[],
    unitVersion: number
  ): Promise<void> {
    for (const exp of experiences) {
      const key = LLM_STORAGE_KEYS.getUnitExperienceKey(unitId, exp.id);
      await this.agentMemory.reasoningBank.storeMetadata(
        key,
        LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
        {
          ...exp,
          // Add unit binding metadata
          boundToUnit: unitId,
          boundAt: new Date().toISOString(),
          unitVersion,
          // Ensure dates are serializable
          timestamp: exp.timestamp instanceof Date ? exp.timestamp.toISOString() : exp.timestamp,
        }
      );
    }
  }

  /**
   * Copy experiences by ID to unit-specific storage
   * Falls back to loading from global storage first
   *
   * @param unitId - Learning unit ID
   * @param experienceIds - Experience IDs to copy
   * @param unitVersion - Current unit version (for tracking)
   */
  private async copyExperiencesByIdToUnit(
    unitId: string,
    experienceIds: string[],
    unitVersion: number
  ): Promise<void> {
    for (const expId of experienceIds) {
      try {
        // Load from global storage
        const exp = await this.agentMemory.reasoningBank.getMetadata(
          expId,
          LLM_STORAGE_KEYS.EXPERIENCE_TYPE
        ) as LLMExperience | null;

        if (exp) {
          const key = LLM_STORAGE_KEYS.getUnitExperienceKey(unitId, expId);
          await this.agentMemory.reasoningBank.storeMetadata(
            key,
            LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
            {
              ...exp,
              boundToUnit: unitId,
              boundAt: new Date().toISOString(),
              unitVersion,
            }
          );
        }
      } catch {
        // Experience doesn't exist, skip
      }
    }
  }

  /**
   * Delete global experiences after they've been absorbed (Sticky Experience Model)
   *
   * This implements decision 1b: experiences are "consumed" when absorbed into a unit.
   * The unit-bound copy becomes the authoritative source; the global copy is deleted.
   *
   * @param experienceIds - Experience IDs to delete from global storage
   * @returns Number of experiences deleted
   */
  private async deleteGlobalExperiences(experienceIds: string[]): Promise<number> {
    let deletedCount = 0;
    for (const expId of experienceIds) {
      try {
        const deleted = await this.agentMemory.reasoningBank.deleteMetadata(
          expId,
          LLM_STORAGE_KEYS.EXPERIENCE_TYPE
        );
        if (deleted) {
          deletedCount++;
        }
      } catch {
        // Continue on error
      }
    }
    return deletedCount;
  }

  /**
   * Sync learning unit metadata with actual database state
   *
   * This method recalculates metadata based on which absorbed experiences
   * still exist in the database. Supports both:
   * - New sticky model: checks unit-bound experiences (unit_experience type)
   * - Legacy model: checks global experiences (llm_experience type)
   *
   * @param unitId - Learning unit ID to sync
   * @returns Updated metadata counts, or null if unit not found
   */
  async syncMetadata(unitId: string): Promise<{
    before: number;
    after: number;
    removed: number;
    puzzleBreakdown: Record<string, number>;
  } | null> {
    const unit = await this.get(unitId);
    if (!unit) {
      return null;
    }

    const beforeCount = unit.absorbedExperienceIds.length;

    // First, check if unit uses new sticky model (has unit-bound experiences)
    const unitBoundExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
      { boundToUnit: unitId }
    ) as any[];

    let existingIds: string[] = [];
    const newBreakdown: Record<string, number> = {};

    if (unitBoundExperiences.length > 0) {
      // New sticky model: count from unit-bound experiences
      for (const exp of unitBoundExperiences) {
        existingIds.push(exp.id);
        const puzzleKey = exp.puzzleId || 'unknown';
        const puzzleName = puzzleKey.replace(/_[^_]+$/, '');
        newBreakdown[puzzleName] = (newBreakdown[puzzleName] || 0) + 1;
      }
    } else {
      // Legacy model: check global experiences via absorbedExperienceIds
      for (const expId of unit.absorbedExperienceIds) {
        try {
          const exp = await this.agentMemory.reasoningBank.getMetadata(
            expId,
            LLM_STORAGE_KEYS.EXPERIENCE_TYPE
          ) as any;

          if (exp) {
            existingIds.push(expId);
            const puzzleKey = exp.puzzleId || 'unknown';
            const puzzleName = puzzleKey.replace(/_[^_]+$/, '');
            newBreakdown[puzzleName] = (newBreakdown[puzzleName] || 0) + 1;
          }
        } catch {
          // Experience no longer exists
        }
      }
    }

    const afterCount = existingIds.length;
    const removedCount = beforeCount - afterCount;

    // Only update if something changed
    if (removedCount !== 0 || afterCount !== beforeCount) {
      const updatedUnit: LearningUnit = {
        ...unit,
        absorbedExperienceIds: existingIds,
        lastUpdatedAt: new Date(),
        metadata: {
          ...unit.metadata,
          totalExperiences: afterCount,
          puzzleBreakdown: newBreakdown,
          version: unit.metadata.version + 1,
        },
      };

      await this.saveUnitMetadata(updatedUnit);
    }

    return {
      before: beforeCount,
      after: afterCount,
      removed: removedCount,
      puzzleBreakdown: newBreakdown,
    };
  }

  /**
   * Sync metadata for all learning units in this profile
   *
   * @returns Summary of sync results
   */
  async syncAllMetadata(): Promise<{
    unitsChecked: number;
    unitsUpdated: number;
    totalExperiencesRemoved: number;
  }> {
    // Query all units directly to avoid get() key mapping issues
    const allUnits = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
      {}
    ) as any[];

    const profileUnits = allUnits.filter(
      (unit) => unit.profileName === this.profileName
    );

    let unitsUpdated = 0;
    let totalRemoved = 0;

    for (const unit of profileUnits) {
      const result = await this.syncMetadataFromRaw(unit);
      if (result && result.removed > 0) {
        unitsUpdated++;
        totalRemoved += result.removed;
      }
    }

    return {
      unitsChecked: profileUnits.length,
      unitsUpdated,
      totalExperiencesRemoved: totalRemoved,
    };
  }

  /**
   * Sync metadata from raw unit data (bypasses get() which can have key issues)
   * Supports both sticky model (unit-bound) and legacy model (global experiences)
   */
  private async syncMetadataFromRaw(rawUnit: any): Promise<{
    before: number;
    after: number;
    removed: number;
  } | null> {
    if (!rawUnit || !rawUnit.absorbedExperienceIds) {
      return null;
    }

    const beforeCount = rawUnit.absorbedExperienceIds.length;
    const unitId = rawUnit.id;

    // First, check if unit uses new sticky model (has unit-bound experiences)
    const unitBoundExperiences = await this.agentMemory.reasoningBank.queryMetadata(
      LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
      { boundToUnit: unitId }
    ) as any[];

    let existingIds: string[] = [];
    const newBreakdown: Record<string, number> = {};

    if (unitBoundExperiences.length > 0) {
      // New sticky model: count from unit-bound experiences
      for (const exp of unitBoundExperiences) {
        existingIds.push(exp.id);
        const puzzleKey = exp.puzzleId || 'unknown';
        const puzzleName = puzzleKey.replace(/_[^_]+$/, '');
        newBreakdown[puzzleName] = (newBreakdown[puzzleName] || 0) + 1;
      }
    } else {
      // Legacy model: check global experiences via absorbedExperienceIds
      for (const expId of rawUnit.absorbedExperienceIds) {
        try {
          const exp = await this.agentMemory.reasoningBank.getMetadata(
            expId,
            LLM_STORAGE_KEYS.EXPERIENCE_TYPE
          ) as any;

          if (exp) {
            existingIds.push(expId);
            const puzzleKey = exp.puzzleId || 'unknown';
            const puzzleName = puzzleKey.replace(/_[^_]+$/, '');
            newBreakdown[puzzleName] = (newBreakdown[puzzleName] || 0) + 1;
          }
        } catch {
          // Experience no longer exists
        }
      }
    }

    const afterCount = existingIds.length;
    const removedCount = beforeCount - afterCount;

    // Only update if something changed
    if (removedCount > 0) {
      const key = LLM_STORAGE_KEYS.getLearningUnitKey(this.profileName, rawUnit.id);

      await this.agentMemory.reasoningBank.storeMetadata(
        key,
        LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
        {
          ...rawUnit,
          absorbedExperienceIds: existingIds,
          lastUpdatedAt: new Date().toISOString(),
          metadata: {
            ...rawUnit.metadata,
            totalExperiences: afterCount,
            puzzleBreakdown: newBreakdown,
            version: (rawUnit.metadata?.version || 0) + 1,
          },
        }
      );
    }

    return {
      before: beforeCount,
      after: afterCount,
      removed: removedCount,
    };
  }

  /**
   * Merge multiple learning units into a new one
   * Note: This creates the merged unit structure. The actual strategy merging
   * via LLM is done by DreamingConsolidator.
   *
   * @param sourceUnitIds - IDs of units to merge
   * @param outputUnitId - ID for the new merged unit
   * @param name - Name for the merged unit
   * @param description - Optional description
   * @returns The merged learning unit (without merged strategies - those are added by consolidator)
   */
  async createMergedUnit(
    sourceUnitIds: string[],
    outputUnitId: string,
    name: string,
    description?: string
  ): Promise<LearningUnit> {
    // Verify source units exist
    const sourceUnits: LearningUnit[] = [];
    for (const id of sourceUnitIds) {
      const unit = await this.get(id);
      if (!unit) {
        throw new Error(`Source learning unit '${id}' not found`);
      }
      sourceUnits.push(unit);
    }

    // Check output doesn't exist
    const existing = await this.get(outputUnitId);
    if (existing) {
      throw new Error(`Output learning unit '${outputUnitId}' already exists`);
    }

    // Combine absorbed experience IDs
    const allExperienceIds = new Set<string>();
    const combinedBreakdown: Record<string, number> = {};

    for (const unit of sourceUnits) {
      for (const id of unit.absorbedExperienceIds) {
        allExperienceIds.add(id);
      }
      for (const [key, count] of Object.entries(unit.metadata.puzzleBreakdown)) {
        combinedBreakdown[key] = (combinedBreakdown[key] || 0) + count;
      }
    }

    // Create merged unit
    const now = new Date();
    const mergedUnit: LearningUnit = {
      id: outputUnitId,
      profileName: this.profileName,
      name,
      description: description || `Merged from: ${sourceUnitIds.join(', ')}`,
      createdAt: now,
      lastUpdatedAt: now,
      fewShots: [], // Will be populated by LLM-driven merge in DreamingConsolidator
      absorbedExperienceIds: Array.from(allExperienceIds),
      metadata: {
        totalExperiences: allExperienceIds.size,
        puzzleBreakdown: combinedBreakdown,
        mergedFromUnits: sourceUnitIds,
        version: 1,
      },
    };

    await this.saveUnitMetadata(mergedUnit);
    return mergedUnit;
  }

  /**
   * Export a learning unit to JSON format
   * @param unitId - Learning unit ID
   * @returns JSON-serializable export object
   */
  async export(unitId: string): Promise<LearningUnitExport> {
    const unit = await this.get(unitId);
    if (!unit) {
      throw new Error(`Learning unit '${unitId}' not found`);
    }

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      unit: {
        ...unit,
        createdAt: unit.createdAt.toISOString(),
        lastUpdatedAt: unit.lastUpdatedAt.toISOString(),
        metadata: {
          ...unit.metadata,
          lastConsolidationAt: unit.metadata.lastConsolidationAt?.toISOString(),
        },
      },
    };
  }

  /**
   * Import a learning unit from JSON format
   * @param data - Exported learning unit data
   * @param overrideId - Optional ID override
   * @returns The imported learning unit
   */
  async import(data: LearningUnitExport, overrideId?: string): Promise<LearningUnit> {
    const unitId = overrideId || data.unit.id;

    // Check if unit exists
    const existing = await this.get(unitId);
    if (existing) {
      throw new Error(`Learning unit '${unitId}' already exists`);
    }

    const now = new Date();
    const unit: LearningUnit = {
      id: unitId,
      profileName: this.profileName,
      name: data.unit.name,
      description: data.unit.description,
      createdAt: now, // Reset to import time
      lastUpdatedAt: now,
      fewShots: data.unit.fewShots || [],
      hierarchy: data.unit.hierarchy,
      absorbedExperienceIds: [], // Don't import - experiences are local
      metadata: {
        totalExperiences: 0, // Reset - experiences are local
        puzzleBreakdown: {},
        version: 1,
      },
    };

    // Save metadata
    await this.saveUnitMetadata(unit);

    // Save few-shots
    if (unit.fewShots.length > 0) {
      await this.saveFewShots(unitId, unit.fewShots);
    }

    // Save hierarchy if present
    if (unit.hierarchy) {
      await this.saveHierarchy(unitId, unit.hierarchy);
    }

    return unit;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async saveUnitMetadata(unit: LearningUnit): Promise<void> {
    const key = LLM_STORAGE_KEYS.getLearningUnitKey(this.profileName, unit.id);

    // Save without fewShots and hierarchy (stored separately)
    const { fewShots, hierarchy, ...metadata } = unit;

    await this.agentMemory.reasoningBank.storeMetadata(
      key,
      LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE,
      {
        ...metadata,
        // Serialize dates
        createdAt: metadata.createdAt.toISOString(),
        lastUpdatedAt: metadata.lastUpdatedAt.toISOString(),
        metadata: {
          ...metadata.metadata,
          lastConsolidationAt: metadata.metadata.lastConsolidationAt?.toISOString(),
        },
      }
    );
  }

  private async updateUnitTimestamp(unitId: string): Promise<void> {
    const unit = await this.get(unitId);
    if (unit) {
      unit.lastUpdatedAt = new Date();
      await this.saveUnitMetadata(unit);
    }
  }

  /**
   * Get legacy few-shots (from before learning units)
   */
  private async getLegacyFewShots(): Promise<FewShotExample[]> {
    const legacyKey = `llm_fewshots:${this.profileName}`;
    const data = await this.agentMemory.reasoningBank.getMetadata(
      legacyKey,
      LLM_STORAGE_KEYS.FEWSHOTS_TYPE
    );

    if (!data || !Array.isArray((data as any).examples)) {
      return [];
    }

    return (data as any).examples as FewShotExample[];
  }

  /**
   * Get or create the default learning unit
   * Migrates legacy few-shots if present
   */
  private async getOrCreateDefaultUnit(): Promise<LearningUnit | null> {
    // Check if default unit exists
    const key = LLM_STORAGE_KEYS.getLearningUnitKey(this.profileName, DEFAULT_LEARNING_UNIT_ID);
    const metadata = await this.agentMemory.reasoningBank.getMetadata(
      key,
      LLM_STORAGE_KEYS.LEARNING_UNIT_TYPE
    );

    if (metadata) {
      const fewShots = await this.getFewShots(DEFAULT_LEARNING_UNIT_ID);
      const hierarchy = await this.getHierarchy(DEFAULT_LEARNING_UNIT_ID);
      return {
        ...(metadata as Omit<LearningUnit, 'fewShots' | 'hierarchy'>),
        fewShots,
        hierarchy,
        createdAt: new Date((metadata as any).createdAt),
        lastUpdatedAt: new Date((metadata as any).lastUpdatedAt),
      } as LearningUnit;
    }

    // Check for legacy few-shots
    const legacyFewShots = await this.getLegacyFewShots();
    const legacyHierarchy = await this.agentMemory.reasoningBank.getMetadata(
      `llm_hierarchy:${this.profileName}`,
      'abstraction_hierarchy'
    ) as AbstractionHierarchy | null;

    if (legacyFewShots.length === 0 && !legacyHierarchy) {
      return null;
    }

    // Create default unit with legacy data
    const now = new Date();
    const defaultUnit: LearningUnit = {
      id: DEFAULT_LEARNING_UNIT_ID,
      profileName: this.profileName,
      name: 'Default',
      description: 'Default learning unit (migrated from legacy storage)',
      createdAt: now,
      lastUpdatedAt: now,
      fewShots: legacyFewShots,
      hierarchy: legacyHierarchy || undefined,
      absorbedExperienceIds: [],
      metadata: {
        totalExperiences: 0,
        puzzleBreakdown: {},
        version: 1,
      },
    };

    // Save the migrated unit
    await this.saveUnitMetadata(defaultUnit);
    if (legacyFewShots.length > 0) {
      await this.saveFewShots(DEFAULT_LEARNING_UNIT_ID, legacyFewShots);
    }
    if (legacyHierarchy) {
      await this.saveHierarchy(DEFAULT_LEARNING_UNIT_ID, legacyHierarchy);
    }

    return defaultUnit;
  }

  // ============================================================================
  // Clone and Unconsolidate Operations (Plan Priority 1)
  // ============================================================================

  /**
   * Clone a learning unit to a new ID
   *
   * Creates a complete copy of the learning unit including:
   * - All learning unit metadata
   * - All few-shot examples
   * - Hierarchy (if exists)
   * - All unit-bound experiences
   *
   * Spec: docs/specs/09-cli-interface-spec.md Section 3.8.11.3
   *
   * @param sourceId - ID of the learning unit to clone
   * @param targetId - ID for the new cloned unit
   * @returns The cloned learning unit
   * @throws Error if source doesn't exist or target already exists
   */
  async clone(sourceId: string, targetId: string): Promise<LearningUnit> {
    // Get source unit
    const source = await this.get(sourceId);
    if (!source) {
      throw new Error(`Source unit '${sourceId}' not found`);
    }

    // Check target doesn't exist
    const existing = await this.get(targetId);
    if (existing) {
      throw new Error(`Target unit '${targetId}' already exists`);
    }

    // Clone unit metadata
    const cloned: LearningUnit = {
      ...source,
      id: targetId,
      name: `${source.name} (clone)`,
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
      metadata: {
        ...source.metadata,
        version: 1, // Reset version for new unit
      },
    };

    // Save the cloned unit metadata
    await this.saveUnitMetadata(cloned);

    // Clone few-shots
    if (source.fewShots && source.fewShots.length > 0) {
      await this.saveFewShots(targetId, source.fewShots);
    }

    // Clone hierarchy if exists
    if (source.hierarchy) {
      await this.saveHierarchy(targetId, source.hierarchy);
    }

    // Clone unit-bound experiences
    const sourceExperiences = await this.getUnitExperiences(sourceId);
    if (sourceExperiences.length > 0) {
      for (const exp of sourceExperiences) {
        const clonedExp = {
          ...exp,
          boundToUnit: targetId,
          boundAt: new Date().toISOString(),
        };
        const key = LLM_STORAGE_KEYS.getUnitExperienceKey(targetId, exp.id);
        await this.agentMemory.reasoningBank.storeMetadata(
          key,
          LLM_STORAGE_KEYS.UNIT_EXPERIENCE_TYPE,
          clonedExp
        );
      }
    }

    // Return the full cloned unit with all data loaded
    // (use get() to ensure fewShots and hierarchy are included)
    const fullCloned = await this.get(targetId);
    return fullCloned || cloned;
  }

  /**
   * Restore unit-bound experiences back to the global unconsolidated pool
   *
   * This reverses the "sticky" experience model absorption, enabling:
   * - Re-dreaming with different algorithms on the same experiences
   * - Fixing issues with a consolidation run
   * - Merging experiences from multiple units
   *
   * Spec: docs/specs/09-cli-interface-spec.md Section 3.8.11.4
   *
   * @param unitId - Learning unit ID
   * @returns Number of experiences restored to global pool
   * @throws Error if unit doesn't exist
   */
  async unconsolidateExperiences(unitId: string): Promise<number> {
    // Get unit to verify it exists
    const unit = await this.get(unitId);
    if (!unit) {
      throw new Error(`Learning unit '${unitId}' not found`);
    }

    // Get unit-bound experiences
    const unitExperiences = await this.getUnitExperiences(unitId);
    if (unitExperiences.length === 0) {
      return 0;
    }

    // Restore each experience to global pool
    let restoredCount = 0;
    for (const exp of unitExperiences) {
      // Create global experience without unit binding
      const globalExp = { ...exp };
      delete (globalExp as any).boundToUnit;
      delete (globalExp as any).boundAt;
      delete (globalExp as any).unitVersion;
      (globalExp as any).consolidated = false;

      // Store in global pool
      await this.agentMemory.reasoningBank.storeMetadata(
        exp.id,
        LLM_STORAGE_KEYS.EXPERIENCE_TYPE,
        globalExp
      );
      restoredCount++;
    }

    return restoredCount;
  }
}

/**
 * Export format for learning units
 */
export interface LearningUnitExport {
  version: string;
  exportedAt: string;
  unit: {
    id: string;
    profileName: string;
    name: string;
    description?: string;
    createdAt: string;
    lastUpdatedAt: string;
    fewShots: FewShotExample[];
    hierarchy?: AbstractionHierarchy;
    metadata: {
      totalExperiences: number;
      puzzleBreakdown: Record<string, number>;
      mergedFromUnits?: string[];
      lastConsolidationAt?: string;
      version: number;
    };
  };
}
