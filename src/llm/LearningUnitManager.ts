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
} from './types.js';
import { DEFAULT_LEARNING_UNIT_ID } from './types.js';
import { LLM_STORAGE_KEYS } from './storage-keys.js';

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
      // Check for legacy few-shots without explicit learning unit
      if (id === DEFAULT_LEARNING_UNIT_ID) {
        return this.getOrCreateDefaultUnit();
      }
      return null;
    }

    // Load few-shots separately
    const fewShots = await this.getFewShots(id);
    const hierarchy = await this.getHierarchy(id);

    return {
      ...(metadata as Omit<LearningUnit, 'fewShots' | 'hierarchy'>),
      fewShots,
      hierarchy,
      // Ensure dates are Date objects
      createdAt: new Date((metadata as any).createdAt),
      lastUpdatedAt: new Date((metadata as any).lastUpdatedAt),
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

    return true;
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
   * Mark experiences as absorbed by a learning unit
   * @param unitId - Learning unit ID
   * @param experienceIds - Experience IDs to mark as absorbed
   * @param puzzleBreakdown - Breakdown of puzzle types absorbed
   */
  async markExperiencesAbsorbed(
    unitId: string,
    experienceIds: string[],
    puzzleBreakdown?: Record<string, number>
  ): Promise<void> {
    const unit = await this.get(unitId);
    if (!unit) {
      throw new Error(`Learning unit '${unitId}' not found`);
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
