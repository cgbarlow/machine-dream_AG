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

import { AlgorithmRegistry } from './AlgorithmRegistry.js';
import { FastClusterV2 } from './FastClusterV2.js';

/**
 * Initialize the algorithm registry with available algorithms
 *
 * This should be called once at application startup.
 * Registers FastCluster v2 as the default algorithm.
 *
 * Future: LLM-based algorithms (DeepCluster, LLMCluster) will be
 * registered here when llmClient is provided.
 *
 * @param _llmClient - Optional LLM client for LLM-based algorithms (reserved for future use)
 */
export function initializeAlgorithmRegistry(_llmClient?: any): void {
  const registry = AlgorithmRegistry.getInstance();

  // Register FastCluster v2 as default
  registry.register(new FastClusterV2(), true);
  registry.setDefaultAlgorithm('FastCluster');

  console.log('✅ Algorithm registry initialized');

  // Future: Register LLM-based algorithms when implemented
  // if (llmClient) {
  //   registry.register(new DeepClusterV1(llmClient));
  //   registry.register(new LLMClusterV1(llmClient));
  // }
}
