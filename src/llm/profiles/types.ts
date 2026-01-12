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
  | 'lmstudio'     // LM Studio local server
  | 'openai'       // OpenAI API
  | 'anthropic'    // Anthropic API
  | 'ollama'       // Ollama local
  | 'openrouter'   // OpenRouter
  | 'custom';      // Custom OpenAI-compatible API

/**
 * Model generation parameters
 */
export interface ModelParameters {
  temperature: number;              // 0.0 - 2.0 (default: 0.7)
  maxTokens: number;                // Max response tokens (default: 2048)
  topP?: number;                    // Nucleus sampling (0.0-1.0)
  frequencyPenalty?: number;        // Repetition penalty (-2.0 to 2.0)
  presencePenalty?: number;         // Topic diversity (-2.0 to 2.0)
  stop?: string[];                  // Stop sequences
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
  parameters: ModelParameters;      // Generation parameters

  // Metadata
  createdAt: number;                // Unix timestamp (milliseconds)
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
