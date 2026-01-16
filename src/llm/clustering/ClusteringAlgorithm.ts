/**
 * Clustering Algorithm Interface
 *
 * Defines the contract for dreaming consolidation clustering algorithms.
 * Enables pluggable, versioned algorithms for experience pattern discovery.
 *
 * See:
 * - Spec 18: Algorithm Versioning System
 * - ADR-011: Versioned Algorithms Architecture
 * - ADR-013: AISP Validator Integration
 */

import type { LLMExperience, LLMConfig } from '../types.js';
import type { AISPMode } from '../AISPBuilder.js';

/**
 * Result of clustering operation
 */
export interface ClusteringResult {
  /** Map of cluster name to experiences in that cluster */
  clusters: Map<string, LLMExperience[]>;

  /** Metadata about the clustering operation */
  metadata: {
    /** Total number of experiences processed */
    totalExperiences: number;

    /** Number of clusters created */
    clustersCreated: number;

    /** Time taken to perform clustering (milliseconds) */
    processingTimeMs: number;
  };
}

/**
 * Algorithm metadata for version tracking
 */
export interface AlgorithmMetadata {
  /** Algorithm name (e.g., "FastCluster") */
  name: string;

  /** Version number (e.g., 2) */
  version: number;

  /** Canonical identifier (e.g., "fastclusterv2") */
  identifier: string;

  /** Human-readable description */
  description: string;

  /** Code hash for reproducibility (first 8 chars of SHA-256) */
  codeHash: string;

  /** Creation date of this algorithm version */
  createdAt: Date;
}

/**
 * Clustering Algorithm Interface
 *
 * All clustering algorithms must implement this interface.
 */
export interface ClusteringAlgorithm {
  /**
   * Cluster experiences into semantic groups
   *
   * @param experiences - Array of LLM experiences to cluster
   * @param targetCount - Desired number of clusters (algorithm may produce more or fewer)
   * @param config - LLM configuration (for LLM-based algorithms)
   * @returns Clustering result with clusters and metadata
   */
  cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult>;

  /**
   * Get algorithm metadata
   * @returns Full metadata object
   */
  getMetadata(): AlgorithmMetadata;

  /**
   * Get algorithm name
   * @returns Name (e.g., "FastCluster")
   */
  getName(): string;

  /**
   * Get algorithm version
   * @returns Version number (e.g., 2)
   */
  getVersion(): number;

  /**
   * Get canonical identifier
   * @returns Identifier (e.g., "fastclusterv2")
   */
  getIdentifier(): string;

  /**
   * Set AISP mode for prompt generation
   * When 'aisp-full', all prompts use pure AISP syntax
   *
   * @param mode - AISP mode ('off', 'aisp', 'aisp-full')
   */
  setAISPMode?(mode: AISPMode): void;

  /**
   * Get current AISP mode
   * @returns Current AISP mode
   */
  getAISPMode?(): AISPMode;
}

/**
 * Base implementation of ClusteringAlgorithm
 *
 * Provides common functionality for all concrete algorithms.
 * Concrete algorithms should extend this class and implement the cluster() method.
 */
export abstract class BaseClusteringAlgorithm implements ClusteringAlgorithm {
  protected metadata: AlgorithmMetadata;
  protected aispMode: AISPMode = 'off';

  /**
   * Create a new clustering algorithm
   * @param metadata - Algorithm metadata
   */
  constructor(metadata: AlgorithmMetadata) {
    this.metadata = metadata;
    this.validateMetadata(metadata);
  }

  /**
   * Set AISP mode for prompt generation
   * @param mode - AISP mode ('off', 'aisp', 'aisp-full')
   */
  setAISPMode(mode: AISPMode): void {
    this.aispMode = mode;
  }

  /**
   * Get current AISP mode
   * @returns Current AISP mode
   */
  getAISPMode(): AISPMode {
    return this.aispMode;
  }

  /**
   * Cluster experiences (must be implemented by subclass)
   */
  abstract cluster(
    experiences: LLMExperience[],
    targetCount: number,
    config: LLMConfig
  ): Promise<ClusteringResult>;

  /**
   * Get algorithm metadata
   */
  getMetadata(): AlgorithmMetadata {
    return this.metadata;
  }

  /**
   * Get algorithm name
   */
  getName(): string {
    return this.metadata.name;
  }

  /**
   * Get algorithm version
   */
  getVersion(): number {
    return this.metadata.version;
  }

  /**
   * Get canonical identifier
   */
  getIdentifier(): string {
    return this.metadata.identifier;
  }

  /**
   * Validate metadata format
   * @param metadata - Metadata to validate
   * @throws Error if metadata is invalid
   */
  private validateMetadata(metadata: AlgorithmMetadata): void {
    // Validate version is positive integer (check this first)
    if (!Number.isInteger(metadata.version) || metadata.version < 1) {
      throw new Error(`Version must be a positive integer, got ${metadata.version}`);
    }

    // Validate code hash format (8 hex characters)
    if (!/^[0-9a-f]{8}$/i.test(metadata.codeHash)) {
      throw new Error(
        `Code hash must be 8 hex characters, got "${metadata.codeHash}"`
      );
    }

    // Validate identifier format: lowercase name + 'v' + version number
    const expectedIdentifier = `${metadata.name.toLowerCase()}v${metadata.version}`;
    if (metadata.identifier !== expectedIdentifier) {
      throw new Error(
        `Invalid identifier: expected "${expectedIdentifier}", got "${metadata.identifier}"`
      );
    }
  }
}
