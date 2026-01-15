/**
 * Clustering Module Index
 *
 * Exports all clustering algorithms and registry functionality.
 * Provides initialization function for algorithm registration.
 *
 * See:
 * - Spec 18: Algorithm Versioning System
 * - ADR-011: Versioned Algorithms Architecture
 */

export * from './ClusteringAlgorithm.js';
export * from './AlgorithmRegistry.js';
export * from './FastClusterV2.js';
export * from './DeepClusterV1.js';
export * from './LLMClusterV1.js';
export * from './LLMClusterV2.js';

import { AlgorithmRegistry } from './AlgorithmRegistry.js';
import { FastClusterV2 } from './FastClusterV2.js';
import { DeepClusterV1 } from './DeepClusterV1.js';
import { LLMClusterV1, type LLMClusterConfig } from './LLMClusterV1.js';
import { LLMClusterV2, type LLMClusterV2Config } from './LLMClusterV2.js';
import type { LMStudioClient } from '../LMStudioClient.js';

// Track whether registry has been initialized
let registryInitialized = false;

/**
 * Options for initializing the algorithm registry
 */
export interface AlgorithmRegistryOptions {
  llmClient?: LMStudioClient;
  llmClusterConfig?: Partial<LLMClusterConfig>;
  llmClusterV2Config?: Partial<LLMClusterV2Config>;
  silent?: boolean;
}

/**
 * Initialize the algorithm registry with available algorithms
 *
 * This should be called once at application startup.
 * Registers all available clustering algorithms:
 * - FastCluster v2 (default) - Keyword-based with dominant cluster fix
 * - DeepCluster v1 - Two-phase: keyword + LLM semantic split
 * - LLMCluster v1 - Fully LLM-driven pattern identification
 * - LLMCluster v2 - Enhanced LLM-driven with mutual exclusivity & self-critique
 *
 * @param llmClient - Optional LLM client for LLM-based algorithms
 * @param silent - Suppress console output (default: false)
 * @param llmClusterConfig - Optional config for LLMCluster v1 (Spec 18 Section 3.3.4)
 */
export function initializeAlgorithmRegistry(
  llmClient?: LMStudioClient,
  silent = false,
  llmClusterConfig?: Partial<LLMClusterConfig>
): void {
  const registry = AlgorithmRegistry.getInstance();

  // If already initialized with LLM client, don't re-register base algorithms
  const hasLLMAlgorithms = registry.getAlgorithm('DeepCluster') !== null;

  if (!registryInitialized) {
    // Register FastCluster v2 as default (no LLM client needed)
    const fastCluster = new FastClusterV2();
    registry.register(fastCluster, true);
    registry.setDefaultAlgorithm(fastCluster.getName());

    registryInitialized = true;
  }

  // Register LLM-based algorithms if client provided and not already registered
  if (llmClient && !hasLLMAlgorithms) {
    const deepCluster = new DeepClusterV1(llmClient);
    const llmCluster = new LLMClusterV1(llmClient, llmClusterConfig);
    const llmClusterV2 = new LLMClusterV2(llmClient);

    registry.register(deepCluster);
    registry.register(llmCluster);
    registry.register(llmClusterV2);
  }

  if (!silent && !hasLLMAlgorithms) {
    console.log('✅ Algorithm registry initialized');
  }
}
