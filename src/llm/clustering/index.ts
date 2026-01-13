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
 */
export function initializeAlgorithmRegistry(llmClient?: LMStudioClient): void {
  const registry = AlgorithmRegistry.getInstance();

  // Register FastCluster v2 as default (no LLM client needed)
  registry.register(new FastClusterV2(), true);
  registry.setDefaultAlgorithm('FastCluster');

  console.log('✅ Registered fastclusterv2 (default)');

  // Register LLM-based algorithms if client provided
  if (llmClient) {
    registry.register(new DeepClusterV1(llmClient));
    registry.register(new LLMClusterV1(llmClient));
    console.log('✅ Registered deepclusterv1');
    console.log('✅ Registered llmclusterv1');
  }

  console.log('✅ Algorithm registry initialized');
}
