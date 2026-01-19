/**
 * Clustering Module Index
 *
 * Exports all clustering algorithms and registry functionality.
 * Provides initialization function for algorithm registration.
 *
 * See:
 * - Spec 18: Algorithm Versioning System
 * - ADR-011: Versioned Algorithms Architecture
 * - ADR-013: AISP Validator Integration
 */

export * from './ClusteringAlgorithm.js';
export * from './AlgorithmRegistry.js';
export * from './FastClusterV2.js';
export * from './FastClusterV3.js';
export * from './FastClusterV4.js';
export * from './DeepClusterV1.js';
export * from './DeepClusterV2.js';
export * from './LLMClusterV1.js';
export * from './LLMClusterV2.js';
export * from './LLMClusterV3.js';

import { AlgorithmRegistry } from './AlgorithmRegistry.js';
import { FastClusterV2 } from './FastClusterV2.js';
import { FastClusterV3 } from './FastClusterV3.js';
import { FastClusterV4 } from './FastClusterV4.js';
import { DeepClusterV1 } from './DeepClusterV1.js';
import { DeepClusterV2 } from './DeepClusterV2.js';
import { LLMClusterV1, type LLMClusterConfig } from './LLMClusterV1.js';
import { LLMClusterV2, type LLMClusterV2Config } from './LLMClusterV2.js';
import { LLMClusterV3 } from './LLMClusterV3.js';
import type { LMStudioClient } from '../LMStudioClient.js';
import type { ValidatedLLMClient } from '../ValidatedLLMClient.js';

// Track whether registry has been initialized
let registryInitialized = false;

/**
 * Options for initializing the algorithm registry
 */
export interface AlgorithmRegistryOptions {
  /** LMStudioClient for V1 algorithms (DeepClusterV1, LLMClusterV1) */
  llmClient?: LMStudioClient;
  /** ValidatedLLMClient for V2 algorithms with AISP support (DeepClusterV2, LLMClusterV2) */
  validatedClient?: ValidatedLLMClient;
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
 * - FastCluster v3 - Keyword-based with AISP cluster naming (ADR-013)
 * - DeepCluster v1 - Two-phase: keyword + LLM semantic split
 * - DeepCluster v2 - Two-phase with AISP semantic prompts (ADR-013)
 * - LLMCluster v1 - Fully LLM-driven pattern identification
 * - LLMCluster v2 - Enhanced LLM-driven with mutual exclusivity, self-critique, and AISP support
 * - LLMCluster v3 - Scale-aware pattern diversity with 1-indexed prompts and breadth checking
 *
 * @param llmClient - Optional LLM client for LLM-based algorithms
 * @param silent - Suppress console output (default: false)
 * @param llmClusterConfig - Optional config for LLMCluster v1 (Spec 18 Section 3.3.4)
 */
export function initializeAlgorithmRegistry(
  llmClient?: LMStudioClient,
  silent = false,
  llmClusterConfig?: Partial<LLMClusterConfig>,
  validatedClient?: ValidatedLLMClient
): void {
  const registry = AlgorithmRegistry.getInstance();

  // If already initialized with LLM client, don't re-register base algorithms
  const hasLLMAlgorithms = registry.getAlgorithm('DeepCluster') !== null;

  if (!registryInitialized) {
    // Register FastCluster v2 as default (no LLM client needed)
    const fastCluster = new FastClusterV2();
    registry.register(fastCluster, true);
    registry.setDefaultAlgorithm(fastCluster.getName());

    // Register FastCluster v3 with AISP support (ADR-013)
    const fastClusterV3 = new FastClusterV3();
    registry.register(fastClusterV3);

    // Register FastCluster v4 with dual-mode AISP keyword extraction (Spec 18 Section 3.8)
    const fastClusterV4 = new FastClusterV4();
    registry.register(fastClusterV4);

    registryInitialized = true;
  }

  // Register LLM-based algorithms if client provided and not already registered
  if ((llmClient || validatedClient) && !hasLLMAlgorithms) {
    // V1 algorithms use LMStudioClient (use provided or get from validated client)
    const baseClient = llmClient || validatedClient?.getUnderlyingClient();
    if (baseClient) {
      const deepCluster = new DeepClusterV1(baseClient);
      const llmCluster = new LLMClusterV1(baseClient, llmClusterConfig);
      registry.register(deepCluster);
      registry.register(llmCluster);
    }

    // V2 algorithms use ValidatedLLMClient for centralized AISP validation
    if (validatedClient) {
      const deepClusterV2 = new DeepClusterV2(validatedClient);
      const llmClusterV2 = new LLMClusterV2(validatedClient);
      const llmClusterV3 = new LLMClusterV3(validatedClient);
      registry.register(deepClusterV2);
      registry.register(llmClusterV2);
      registry.register(llmClusterV3);
      if (!silent) console.log(`✅ Registered llmclusterv3`);
    }
  }

  if (!silent && !hasLLMAlgorithms) {
    console.log('✅ Algorithm registry initialized');
  }
}
