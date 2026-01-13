/**
 * Algorithm Registry
 *
 * Singleton registry for managing clustering algorithm versions.
 * Enables version tracking, default selection, and backward compatibility.
 *
 * See:
 * - Spec 18: Algorithm Versioning System
 * - ADR-011: Versioned Algorithms Architecture
 */

import type { ClusteringAlgorithm } from './ClusteringAlgorithm.js';

/**
 * Registry entry for an algorithm version
 */
interface AlgorithmEntry {
  /** The algorithm instance */
  algorithm: ClusteringAlgorithm;

  /** Whether this is the default algorithm */
  isDefault: boolean;

  /** Registration timestamp */
  registeredAt: Date;
}

/**
 * AlgorithmRegistry - Singleton pattern
 *
 * Manages registration and retrieval of clustering algorithms with version tracking.
 */
export class AlgorithmRegistry {
  private static instance: AlgorithmRegistry;

  /** Map of algorithm name to versions (sorted descending by version) */
  private algorithms: Map<string, AlgorithmEntry[]>;

  /** Name of the default algorithm */
  private defaultAlgorithm: string = 'FastCluster';

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    this.algorithms = new Map();
  }

  /**
   * Get the singleton instance
   * @returns The global AlgorithmRegistry instance
   */
  static getInstance(): AlgorithmRegistry {
    if (!AlgorithmRegistry.instance) {
      AlgorithmRegistry.instance = new AlgorithmRegistry();
    }
    return AlgorithmRegistry.instance;
  }

  /**
   * Register an algorithm
   *
   * @param algorithm - The clustering algorithm to register
   * @param isDefault - Whether this algorithm should be the default (optional)
   * @throws Error if algorithm version is already registered
   */
  register(algorithm: ClusteringAlgorithm, isDefault: boolean = false): void {
    const name = algorithm.getName();

    // Initialize entry array if needed
    if (!this.algorithms.has(name)) {
      this.algorithms.set(name, []);
    }

    const entries = this.algorithms.get(name)!;

    // Check for duplicate version
    const existingVersion = entries.find(
      (e) => e.algorithm.getVersion() === algorithm.getVersion()
    );
    if (existingVersion) {
      throw new Error(
        `Algorithm ${name} v${algorithm.getVersion()} is already registered`
      );
    }

    // Add new entry
    entries.push({
      algorithm,
      isDefault,
      registeredAt: new Date(),
    });

    // Sort by version descending (latest first)
    entries.sort((a, b) => b.algorithm.getVersion() - a.algorithm.getVersion());

    console.log(
      `✅ Registered ${algorithm.getIdentifier()} ${isDefault ? '(default)' : ''}`
    );
  }

  /**
   * Get a specific algorithm
   *
   * @param name - Algorithm name (e.g., "FastCluster")
   * @param version - Optional version number (defaults to latest)
   * @returns The algorithm, or null if not found
   */
  getAlgorithm(name: string, version?: number): ClusteringAlgorithm | null {
    const entries = this.algorithms.get(name);
    if (!entries || entries.length === 0) {
      return null;
    }

    // If version specified, find exact match
    if (version !== undefined) {
      const entry = entries.find((e) => e.algorithm.getVersion() === version);
      return entry?.algorithm || null;
    }

    // Otherwise, return latest version (first in sorted array)
    return entries[0].algorithm;
  }

  /**
   * Get all registered algorithms (latest version of each)
   * @returns Array of latest algorithm versions
   */
  getAllAlgorithms(): ClusteringAlgorithm[] {
    const algorithms: ClusteringAlgorithm[] = [];

    for (const entries of this.algorithms.values()) {
      if (entries.length > 0) {
        // First entry is latest version (sorted descending)
        algorithms.push(entries[0].algorithm);
      }
    }

    return algorithms;
  }

  /**
   * Get the default algorithm
   * @returns The default clustering algorithm
   * @throws Error if default algorithm is not registered
   */
  getDefaultAlgorithm(): ClusteringAlgorithm {
    const algorithm = this.getAlgorithm(this.defaultAlgorithm);
    if (!algorithm) {
      throw new Error(
        `Default algorithm "${this.defaultAlgorithm}" is not registered`
      );
    }
    return algorithm;
  }

  /**
   * Set the default algorithm
   *
   * @param name - Name of the algorithm to set as default
   * @throws Error if algorithm is not registered
   */
  setDefaultAlgorithm(name: string): void {
    if (!this.algorithms.has(name)) {
      throw new Error(`Algorithm "${name}" is not registered`);
    }
    this.defaultAlgorithm = name;
    console.log(`✅ Set default algorithm: ${name}`);
  }

  /**
   * Map a legacy learning unit name to new format
   *
   * Legacy format: {profile}_{mode}_{date}[_2x]
   * New format: {profile}_{mode}_{algo}v{version}_{date}[_2x]
   *
   * @param unitName - Legacy or new format unit name
   * @returns Mapped unit name (unchanged if already has algorithm)
   */
  mapLegacyUnit(unitName: string): string {
    // Check if unit name already has algorithm identifier
    // Pattern: _(fastcluster|deepcluster|llmcluster)v\d+_
    const hasAlgorithm = /(fastcluster|deepcluster|llmcluster)v\d+/i.test(
      unitName
    );
    if (hasAlgorithm) {
      return unitName; // Already has algorithm, return unchanged
    }

    // Find date pattern: _YYYYMMDD
    const dateMatch = unitName.match(/_(\d{8})(_|$)/);
    if (!dateMatch || dateMatch.index === undefined) {
      // No date pattern found, append algorithm to end
      const defaultAlgo = this.getDefaultAlgorithm();
      return `${unitName}_${defaultAlgo.getIdentifier()}`;
    }

    // Insert algorithm identifier before date
    const beforeDate = unitName.substring(0, dateMatch.index);
    const afterDate = unitName.substring(dateMatch.index);
    const defaultAlgo = this.getDefaultAlgorithm();

    return `${beforeDate}_${defaultAlgo.getIdentifier()}${afterDate}`;
  }

  /**
   * Get all registered algorithm names
   * @returns Array of algorithm names
   */
  getAlgorithmNames(): string[] {
    return Array.from(this.algorithms.keys());
  }

  /**
   * Get all versions of a specific algorithm
   *
   * @param name - Algorithm name
   * @returns Array of versions (descending order)
   */
  getVersions(name: string): number[] {
    const entries = this.algorithms.get(name);
    if (!entries) {
      return [];
    }
    return entries.map((e) => e.algorithm.getVersion());
  }

  /**
   * Check if an algorithm is registered
   *
   * @param name - Algorithm name
   * @param version - Optional version number
   * @returns True if algorithm (and version) is registered
   */
  hasAlgorithm(name: string, version?: number): boolean {
    const entries = this.algorithms.get(name);
    if (!entries || entries.length === 0) {
      return false;
    }

    if (version !== undefined) {
      return entries.some((e) => e.algorithm.getVersion() === version);
    }

    return true;
  }

  /**
   * Clear all registered algorithms (for testing)
   * @internal
   */
  clearAll(): void {
    this.algorithms.clear();
    this.defaultAlgorithm = 'FastCluster';
  }
}
