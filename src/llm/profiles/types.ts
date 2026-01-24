/**
 * LLM Profile Management - Type Definitions
 *
 * Spec 13: LLM Profile Management
 *
 * Defines types for managing AI model connection profiles.
 */

/**
 * Supported LLM providers
 */
export type LLMProvider =
  | 'lmstudio'      // LM Studio local server
  | 'llama-server'  // llama.cpp llama-server (direct)
  | 'openai'        // OpenAI API
  | 'anthropic'     // Anthropic API
  | 'ollama'        // Ollama local
  | 'openrouter'    // OpenRouter
  | 'custom';       // Custom OpenAI-compatible API

/**
 * Model generation parameters
 */
export interface ModelParameters {
  temperature: number;              // 0.0 - 2.0 (default: 0.7)
  maxTokens: number;                // Max response tokens (default: 2048)
  topP?: number;                    // Nucleus sampling (0.0-1.0)
  topK?: number;                    // Top-K sampling (e.g., 50)
  minP?: number;                    // Min-P sampling (0.0-1.0, e.g., 0.01)
  frequencyPenalty?: number;        // Repetition penalty (-2.0 to 2.0)
  presencePenalty?: number;         // Topic diversity (-2.0 to 2.0)
  repeatPenalty?: number;           // Repeat penalty (1.0 = disabled)
  stop?: string[];                  // Stop sequences

  // DRY (Don't Repeat Yourself) sampling parameters
  dryMultiplier?: number;           // DRY penalty multiplier (e.g., 1.1)
  dryBase?: number;                 // DRY base value (e.g., 1.75)
  dryAllowedLength?: number;        // Min sequence length for DRY (e.g., 2)
  dryPenaltyLastN?: number;         // Context for DRY penalty (-1 = full context)
}

/**
 * Complete LLM connection profile
 */
export interface LLMProfile {
  // Identity
  name: string;                     // Unique identifier (e.g., "lm-studio-local")
  description?: string;             // Human-readable description

  // Provider Configuration
  provider: LLMProvider;            // Provider type
  baseUrl: string;                  // API endpoint
  apiKey?: string;                  // API key (optional, stored securely)

  // Model Configuration
  model: string;                    // Model name/ID (friendly name for display)
  modelPath?: string;               // Full model path for LM Studio CLI (e.g., "Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf")
  llamaServerPath?: string;         // Path to llama-server executable (for llama-server provider)
  launchCommand?: string;           // Override launch command (for llama-server provider) - if set, used instead of auto-generated
  parameters: ModelParameters;      // Generation parameters

  // Metadata
  createdAt: number;                // Unix timestamp (milliseconds)
  modifiedAt?: number;              // Last modification timestamp
  lastUsed?: number;                // Last usage timestamp
  usageCount: number;               // Number of times used
  isDefault: boolean;               // Is this the active profile?

  // Connection
  timeout: number;                  // Request timeout (ms, default: 60000)
  retries: number;                  // Max retry attempts (default: 3)

  // Tags & Organization
  tags: string[];                   // User-defined tags
  color?: string;                   // Display color for TUI

  // Custom Prompting
  systemPrompt?: string;            // Additional system prompt text (appended to base prompt)

  // Instance support (parameter variants)
  instances?: Record<string, ProfileInstance>; // Instance name -> instance config
  activeInstance?: string;          // Currently active instance name (default: "default")
}

/**
 * Profile storage format
 */
export interface ProfileStorage {
  version: string;                  // Storage format version
  profiles: Record<string, LLMProfile>; // Profile name -> profile
  activeProfile?: string;           // Currently active profile name
}

/**
 * Profile validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Profile health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;                 // Response time in ms
  model?: string;                   // Confirmed model name
  error?: string;                   // Error message if unhealthy
  timestamp: number;                // Check timestamp
}

/**
 * Profile instance - a named configuration variant of a profile
 * Allows multiple parameter sets for the same profile/model
 */
export interface ProfileInstance {
  name: string;                     // Instance identifier (e.g., "default", "20260122_test1")
  description?: string;             // Human-readable description
  parameters: ModelParameters;      // Generation parameters for this instance
  launchCommand?: string;           // Override launch command (for llama-server provider)
  createdAt: number;                // Unix timestamp (milliseconds)
  modifiedAt?: number;              // Last modification timestamp
  lastUsed?: number;                // Last usage timestamp
}

/**
 * Profile creation options
 */
export interface CreateProfileOptions {
  name: string;
  description?: string;
  provider: LLMProvider;
  baseUrl: string;
  apiKey?: string;
  model: string;
  modelPath?: string;               // Full model path for LM Studio CLI
  llamaServerPath?: string;         // Path to llama-server executable
  launchCommand?: string;           // Override launch command (llama-server provider)
  parameters?: Partial<ModelParameters>;
  timeout?: number;
  retries?: number;
  tags?: string[];
  color?: string;
  systemPrompt?: string;            // Additional system prompt text
  setDefault?: boolean;             // Set as active profile after creation
}

/**
 * Profile update options (all fields optional)
 */
export type UpdateProfileOptions = Partial<Omit<CreateProfileOptions, 'name'>>;

/**
 * Profile export options
 */
export interface ExportOptions {
  includeSecrets?: boolean;         // Include API keys (default: false)
  profiles?: string[];              // Specific profiles to export (default: all)
  format?: 'json' | 'yaml';         // Export format (default: json)
}

/**
 * Profile import result
 */
export interface ImportResult {
  imported: string[];               // Successfully imported profile names
  skipped: string[];                // Skipped (already exist)
  errors: Array<{ profile: string; error: string }>;
}

/**
 * Instance creation options
 */
export interface CreateInstanceOptions {
  name: string;                     // Instance identifier
  description?: string;             // Human-readable description
  parameters?: Partial<ModelParameters>; // Parameters (merged with profile defaults)
  launchCommand?: string;           // Override launch command (for llama-server)
  copyFrom?: string;                // Copy parameters from existing instance
  setActive?: boolean;              // Set as active instance after creation
}

/**
 * Instance update options
 */
export interface UpdateInstanceOptions {
  description?: string;             // New description
  parameters?: Partial<ModelParameters>; // Parameters to update
}

/**
 * Instance rename options
 */
export interface RenameInstanceOptions {
  oldName: string;
  newName: string;
}
