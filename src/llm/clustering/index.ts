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

import { AlgorithmRegistry } from './AlgorithmRegistry.js';
import { FastClusterV2 } from './FastClusterV2.js';
import { DeepClusterV1 } from './DeepClusterV1.js';
import { LLMClusterV1 } from './LLMClusterV1.js';
import type { LMStudioClient } from '../LMStudioClient.js';

/**
 * Initialize the algorithm registry with available algorithms
 *
 * This should be called once at application startup.
 * Registers all available clustering algorithms:
 * - FastCluster v2 (default) - Keyword-based with dominant cluster fix
 * - DeepCluster v1 - Two-phase: keyword + LLM semantic split
 * - LLMCluster v1 - Fully LLM-driven pattern identification
 *
 * @param llmClient - Optional LLM client for LLM-based algorithms
 * @param silent - Suppress console output (default: false)
 */
export function initializeAlgorithmRegistry(llmClient?: LMStudioClient, silent = false): void {
  const registry = AlgorithmRegistry.getInstance();

  // Register FastCluster v2 as default (no LLM client needed)
  const fastCluster = new FastClusterV2();
  registry.register(fastCluster, true);
  registry.setDefaultAlgorithm(fastCluster.getName());

  if (!silent) {
    console.log('✅ Registered fastclusterv2 (default)');
  }

  // Register LLM-based algorithms if client provided
  if (llmClient) {
    const deepCluster = new DeepClusterV1(llmClient);
    const llmCluster = new LLMClusterV1(llmClient);

    registry.register(deepCluster);
    registry.register(llmCluster);

    if (!silent) {
      console.log('✅ Registered deepclusterv1');
      console.log('✅ Registered llmclusterv1');
    }
  }

  if (!silent) {
    console.log('✅ Algorithm registry initialized');
  }
}
