# Spec 13: LLM Connection Profile Management

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2024-01-06

---

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| [ADR-002: Local LLM Provider](../adr/002-local-llm-provider.md) | Authorizes LLM integration |

---

## 1. Overview

### 1.1 Purpose
Implement a comprehensive profile management system for LLM connections, allowing users to save, switch between, and manage multiple LLM provider configurations without manual editing of config files.

### 1.2 Motivation
- Users need to test multiple LLM providers (LM Studio, OpenAI, Anthropic, Ollama)
- Switching between local and cloud models is cumbersome
- API keys and URLs should be stored securely
- Different models require different configurations (temperature, max_tokens, etc.)
- Team collaboration requires sharing profiles

### 1.3 Success Criteria
- ✅ Save unlimited LLM provider profiles
- ✅ Switch active profile with single command
- ✅ Secure API key storage
- ✅ Profile validation and health checks
- ✅ Import/export profiles for sharing
- ✅ CLI-first with full TUI support

---

## 2. Profile Structure

### 2.1 Profile Schema

```typescript
interface LLMProfile {
  // Identity
  name: string;                      // Unique identifier (e.g., "lm-studio-local")
  description?: string;              // Human-readable description

  // Provider Configuration
  provider: LLMProvider;             // Provider type
  baseUrl: string;                   // API endpoint
  apiKey?: string;                   // API key (optional, stored securely)

  // Model Configuration
  model: string;                     // Model name/ID (friendly name for display)
  modelPath?: string;                // Full model path for LM Studio CLI (e.g., "Qwen/QwQ-32B-GGUF/qwq-32b-q8_0.gguf")
  launchCommand?: string;            // Full command to start server (for llama-server provider)
  parameters: ModelParameters;       // Generation parameters

  // Metadata
  createdAt: number;                 // Unix timestamp
  lastUsed?: number;                 // Last usage timestamp
  usageCount: number;                // Number of times used
  isDefault: boolean;                // Is this the active profile?

  // Connection
  timeout: number;                   // Request timeout (ms)
  retries: number;                   // Max retry attempts

  // Tags & Organization
  tags: string[];                    // User-defined tags
  color?: string;                    // Display color for TUI

  // Custom Prompting
  systemPrompt?: string;             // Additional system prompt text (appended to base prompt)
}

type LLMProvider =
  | 'lmstudio'      // LM Studio local server
  | 'llama-server'  // llama.cpp llama-server (direct)
  | 'openai'        // OpenAI API
  | 'anthropic'     // Anthropic API
  | 'ollama'        // Ollama local
  | 'openrouter'    // OpenRouter
  | 'custom';       // Custom OpenAI-compatible API

interface ModelParameters {
  temperature: number;               // 0.0 - 2.0 (default: 0.7)
  maxTokens: number;                 // Max response tokens
  topP?: number;                     // Nucleus sampling (0.0-1.0)
  topK?: number;                     // Top-K sampling (e.g., 50)
  minP?: number;                     // Min-P sampling (0.0-1.0, e.g., 0.01)
  frequencyPenalty?: number;         // Repetition penalty (-2.0 to 2.0)
  presencePenalty?: number;          // Topic diversity (-2.0 to 2.0)
  repeatPenalty?: number;            // Repeat penalty (1.0 = disabled)
  stop?: string[];                   // Stop sequences

  // DRY (Don't Repeat Yourself) sampling parameters
  dryMultiplier?: number;            // DRY penalty multiplier (e.g., 1.1)
  dryBase?: number;                  // DRY base value (e.g., 1.75)
  dryAllowedLength?: number;         // Min sequence length for DRY (e.g., 2)
  dryPenaltyLastN?: number;          // Context for DRY penalty (-1 = full context)
}
```

### 2.2 Storage Location

**Profile Storage:**
```
~/.machine-dream/llm-profiles.json
```

**Secure Key Storage (optional):**
```
~/.machine-dream/secrets/api-keys.enc
```

**Format:**
```json
{
  "version": "1.0",
  "profiles": {
    "lm-studio-local": {
      "name": "lm-studio-local",
      "description": "Local LM Studio with Qwen3 30B",
      "provider": "lmstudio",
      "baseUrl": "http://localhost:1234/v1",
      "model": "qwen3-30b",
      "parameters": {
        "temperature": 0.7,
        "maxTokens": 2048
      },
      "createdAt": 1704556800000,
      "usageCount": 42,
      "isDefault": true,
      "timeout": 60000,
      "retries": 3,
      "tags": ["local", "default"]
    },
    "openai-gpt4": {
      "name": "openai-gpt4",
      "description": "OpenAI GPT-4 Turbo",
      "provider": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "apiKey": "${OPENAI_API_KEY}",
      "model": "gpt-4-turbo-preview",
      "parameters": {
        "temperature": 0.5,
        "maxTokens": 4096
      },
      "createdAt": 1704556800000,
      "usageCount": 15,
      "isDefault": false,
      "timeout": 120000,
      "retries": 5,
      "tags": ["cloud", "expensive"]
    },
    "glm-4-llama": {
      "name": "glm-4-llama",
      "description": "GLM-4.7 Flash via llama-server (pre-configured sampling)",
      "provider": "llama-server",
      "baseUrl": "http://127.0.0.1:8080",
      "model": "glm-4.7-flash",
      "modelPath": "unsloth/GLM-4.7-Flash-GGUF/GLM-4.7-Flash-UD-Q8_K_XL.gguf",
      "launchCommand": "llama-server.exe --model \"C:\\Users\\user\\.lmstudio\\models\\unsloth\\GLM-4.7-Flash-GGUF\\GLM-4.7-Flash-UD-Q8_K_XL.gguf\" --port 8080 --ctx-size 16384 --n-gpu-layers 999 --flash-attn on --temp 0.2 --top-k 50 --top-p 0.95 --min-p 0.01 --dry-multiplier 1.1",
      "parameters": {
        "temperature": 0.6,
        "maxTokens": 8192
      },
      "createdAt": 1704556800000,
      "usageCount": 0,
      "isDefault": false,
      "timeout": 600000,
      "retries": 3,
      "tags": ["local", "llama-server", "moe"]
    }
  },
  "activeProfile": "lm-studio-local"
}
```

---

## 3. Core Operations

### 3.1 Profile Management

**Create Profile:**
```typescript
profileManager.create({
  name: 'anthropic-claude',
  provider: 'anthropic',
  baseUrl: 'https://api.anthropic.com/v1',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  parameters: { temperature: 0.7, maxTokens: 4096 }
});
```

**List Profiles:**
```typescript
const profiles = profileManager.list({
  filter?: string,        // Filter by name/description
  tags?: string[],        // Filter by tags
  provider?: LLMProvider, // Filter by provider
  sortBy?: 'name' | 'lastUsed' | 'usageCount'
});
```

**Get Profile:**
```typescript
const profile = profileManager.get('lm-studio-local');
```

**Update Profile:**
```typescript
profileManager.update('lm-studio-local', {
  model: 'qwen3-32b',
  parameters: { temperature: 0.8 }
});
```

**Delete Profile:**
```typescript
profileManager.delete('old-profile');
```

**Set Active:**
```typescript
profileManager.setActive('anthropic-claude');
```

### 3.2 Profile Validation

**Health Check:**
```typescript
const health = await profileManager.healthCheck('lm-studio-local');
// Returns:
{
  isHealthy: boolean,
  responseTime: number,
  error?: string,
  modelInfo?: {
    name: string,
    contextLength: number,
    capabilities: string[]
  }
}
```

**Validate Configuration:**
```typescript
const validation = profileManager.validate(profile);
// Returns:
{
  isValid: boolean,
  errors: string[],
  warnings: string[]
}
```

### 3.3 Import/Export

**Export Profiles:**
```typescript
// Export all profiles (excluding API keys)
const exported = profileManager.export({
  includeSecrets: false,  // Don't export API keys
  profiles?: string[]      // Specific profiles (or all)
});

// Format:
{
  version: "1.0",
  exportedAt: 1704556800000,
  profiles: [...],
  metadata: {
    source: "Machine Dream v0.1.0",
    count: 5
  }
}
```

**Import Profiles:**
```typescript
profileManager.import(exportedData, {
  overwrite: false,        // Overwrite existing profiles
  skipInvalid: true,       // Skip invalid profiles
  setActive?: string       // Set specific profile as active
});
```

---

## 4. CLI Commands

### 4.1 Command Structure

```
machine-dream llm profile <command> [options]
```

### 4.2 Commands

#### `profile list`
```bash
# List all profiles
machine-dream llm profile list

# List with filter
machine-dream llm profile list --filter local

# List by provider
machine-dream llm profile list --provider lmstudio

# List by tags
machine-dream llm profile list --tags local,default

# Output formats
machine-dream llm profile list --format table    # Default
machine-dream llm profile list --format json
machine-dream llm profile list --format yaml
```

**Output (table format):**
```
┌──────────────────┬──────────┬──────────────────────┬──────────────┬─────────┬────────┐
│ Name             │ Provider │ Model                │ Status       │ Used    │ Active │
├──────────────────┼──────────┼──────────────────────┼──────────────┼─────────┼────────┤
│ lm-studio-local  │ lmstudio │ qwen3-30b            │ ✓ Healthy    │ 42 uses │ ✓      │
│ openai-gpt4      │ openai   │ gpt-4-turbo-preview  │ ? Untested   │ 15 uses │        │
│ anthropic-claude │ anthropic│ claude-3-5-sonnet    │ ✗ Offline    │  0 uses │        │
└──────────────────┴──────────┴──────────────────────┴──────────────┴─────────┴────────┘
```

#### `profile add`
```bash
# Interactive mode (prompts for all fields)
machine-dream llm profile add

# With options
machine-dream llm profile add lm-studio-local \
  --provider lmstudio \
  --url http://localhost:1234/v1 \
  --model qwen3-30b \
  --temperature 0.7 \
  --max-tokens 2048 \
  --description "Local LM Studio"

# From template
machine-dream llm profile add my-openai --template openai-gpt4 \
  --api-key $OPENAI_API_KEY

# With tags
machine-dream llm profile add test-profile --tags local,testing,experimental

# With custom system prompt (appended to base prompt)
machine-dream llm profile add my-profile \
  --provider lmstudio \
  --url http://localhost:1234/v1 \
  --model qwen3-30b \
  --system-prompt "Always explain your reasoning step by step."
```

#### `profile show`
```bash
# Show profile details
machine-dream llm profile show lm-studio-local

# Show with credentials (requires confirmation)
machine-dream llm profile show lm-studio-local --show-secrets
```

**Output:**
```
Profile: lm-studio-local
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Provider:     lmstudio
Base URL:     http://localhost:1234/v1
Model:        qwen3-30b
Temperature:  0.7
Max Tokens:   2048
Timeout:      60s
Retries:      3

Status:       ✓ Healthy (responded in 245ms)
Created:      2024-01-06 10:30:00
Last Used:    2024-01-06 14:22:15
Usage Count:  42 times
Active:       Yes (default profile)

Tags:         local, default
```

#### `profile edit`
```bash
# Interactive edit
machine-dream llm profile edit lm-studio-local

# Update specific fields
machine-dream llm profile edit lm-studio-local \
  --model qwen3-32b \
  --temperature 0.8

# Add/remove tags
machine-dream llm profile edit lm-studio-local --add-tags production
machine-dream llm profile edit lm-studio-local --remove-tags testing
```

#### `profile delete`
```bash
# Delete with confirmation
machine-dream llm profile delete old-profile

# Force delete (no confirmation)
machine-dream llm profile delete old-profile --force

# Delete multiple
machine-dream llm profile delete profile1 profile2 profile3
```

#### `profile set`
```bash
# Set active profile
machine-dream llm profile set anthropic-claude

# Verify it's active
machine-dream llm profile show --active
```

#### `profile test`
```bash
# Test specific profile
machine-dream llm profile test lm-studio-local

# Test all profiles
machine-dream llm profile test --all

# Test with verbose output
machine-dream llm profile test lm-studio-local --verbose
```

**Output:**
```
Testing profile: lm-studio-local
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Connection successful
✓ Authentication valid
✓ Model available: qwen3-30b
✓ Test request completed

Response Time: 245ms
Model Info:
  - Context Length: 32768 tokens
  - Supports streaming: Yes
  - Supports function calling: Yes

Status: Healthy ✓
```

#### `profile export`
```bash
# Export all profiles
machine-dream llm profile export profiles-backup.json

# Export specific profiles
machine-dream llm profile export my-profiles.json --profiles lm-studio-local,openai-gpt4

# Export with secrets (requires confirmation)
machine-dream llm profile export full-backup.json --include-secrets

# Export as YAML
machine-dream llm profile export profiles.yaml --format yaml
```

#### `profile import`
```bash
# Import profiles
machine-dream llm profile import profiles-backup.json

# Import with overwrite
machine-dream llm profile import profiles-backup.json --overwrite

# Import and set active
machine-dream llm profile import profiles-backup.json --set-active lm-studio-local

# Dry run (validate without importing)
machine-dream llm profile import profiles-backup.json --dry-run
```

---

## 5. TUI Screen

### 5.1 Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔌 LLM Connection Profiles                                  [Add] [Import] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── Active Profile ──────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ✓ lm-studio-local                        🟢 Healthy (245ms)        │  │
│  │                                                                       │  │
│  │  Provider: LM Studio                Model: qwen3-30b                │  │
│  │  URL: http://localhost:1234/v1      Temp: 0.7  Max: 2048           │  │
│  │  Last Used: 2 minutes ago           Used: 42 times                  │  │
│  │                                                                       │  │
│  │  [Test] [Edit] [Switch]                              Tags: local    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── All Profiles ─────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ▶ lm-studio-local    lmstudio    qwen3-30b          🟢 ✓ Active    │  │
│  │    openai-gpt4        openai      gpt-4-turbo        🟡 ? Untested  │  │
│  │    anthropic-claude   anthropic   claude-3-5-sonnet  🔴 ✗ Offline   │  │
│  │    ollama-local       ollama      llama3.1:70b       🟢 ✓ Ready     │  │
│  │    custom-api         custom      custom-model       🟡 ? Unknown   │  │
│  │                                                                       │  │
│  │  Showing 5 of 5 profiles                           Sort: Last Used  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Quick Actions ────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  [1] Test Selected        [4] Delete Selected                       │  │
│  │  [2] Edit Selected        [5] Test All                              │  │
│  │  [3] Set as Active        [6] Export All                            │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Profiles: 5 | Active: 1 | Healthy: 2 | Offline: 1                        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
[↑↓] Navigate [Enter] Details [1-6] Actions [A] Add [E] Edit [D] Delete [Q] Back
```

### 5.2 Add/Edit Profile Form

```
┌────────────────────────────────────────────────────────────────────────────┐
│ 🔌 Add LLM Profile                                          [Save] [Cancel] │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── Basic Information ────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ▶ Profile Name:     [lm-studio-local________________]              │  │
│  │    Description:      [Local LM Studio with Qwen3 30B_]              │  │
│  │                                                                       │  │
│  │    Provider:         [LM Studio          ▼]                          │  │
│  │                      Options: LM Studio, OpenAI, Anthropic,          │  │
│  │                               Ollama, OpenRouter, Custom             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Connection ───────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │    Base URL:         [http://localhost:1234/v1_______]              │  │
│  │    API Key:          [••••••••••••••••••] (optional)  [👁 Show]     │  │
│  │                      ℹ Use ${ENV_VAR} for environment variables      │  │
│  │                                                                       │  │
│  │    Timeout:          [60]s    Retries: [3]                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Model Configuration ──────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │    Model:            [qwen3-30b______________]                       │  │
│  │    Temperature:      [0.7_] (0.0 - 2.0)   ├───────●──────┤          │  │
│  │    Max Tokens:       [2048] (1 - 32768)   ├────●─────────┤          │  │
│  │                                                                       │  │
│  │    ☐ Top P sampling (advanced)                                      │  │
│  │    ☐ Frequency penalty                                               │  │
│  │    ☐ Presence penalty                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── Organization ─────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │    Tags:             [local, default_____________]                   │  │
│  │    Color:            [🟢 Green        ▼]                             │  │
│  │                                                                       │  │
│  │    ☑ Set as active profile                                          │  │
│  │    ☑ Test connection before saving                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [  Save Profile  ]  [  Test Connection  ]  [  Cancel  ]                   │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
[Tab] Next Field [Shift+Tab] Previous [Space] Toggle [Enter] Save [Esc] Cancel
```

---

## 6. Implementation Details

### 6.1 File Structure

```
src/
  llm/
    profiles/
      LLMProfileManager.ts         # Core manager class
      ProfileStorage.ts            # File I/O and persistence
      ProfileValidator.ts          # Validation logic
      ProfileEncryption.ts         # API key encryption (optional)
      types.ts                     # Type definitions
    config.ts                      # Updated with profile support
  cli/
    commands/
      llm-profile.ts               # CLI commands
  tui-ink/
    screens/
      ProfileManagerScreen.tsx     # TUI screen
      ProfileManagerScreen.interactive.tsx
    services/
      CLIExecutor.ts               # Add profile methods
```

### 6.2 Security Considerations

**API Key Storage:**
1. **Option 1: Environment Variables** (Recommended)
   - Store as `${OPENAI_API_KEY}` in profile
   - Resolve at runtime from environment
   - Never store plaintext in files

2. **Option 2: Encrypted Storage**
   - Use node's crypto module
   - Encrypt with machine-specific key
   - Decrypt at runtime
   - Still not 100% secure (keys on disk)

3. **Option 3: External Secret Management**
   - Support 1Password CLI
   - Support system keychain
   - Reference secrets by ID

**Implementation:**
```typescript
// Resolve API key at runtime
function resolveApiKey(key: string): string {
  if (key.startsWith('${') && key.endsWith('}')) {
    const envVar = key.slice(2, -1);
    return process.env[envVar] || '';
  }
  return key; // Use as-is (not recommended for production)
}
```

### 6.3 Backward Compatibility

**Migration from config.ts:**
```typescript
// On first run, create default profile from existing config
if (!fs.existsSync(profilesPath)) {
  const defaultProfile = {
    name: 'default',
    provider: 'lmstudio',
    baseUrl: DEFAULT_LLM_CONFIG.baseUrl,
    model: DEFAULT_LLM_CONFIG.model,
    parameters: {
      temperature: DEFAULT_LLM_CONFIG.temperature,
      maxTokens: DEFAULT_LLM_CONFIG.maxTokens
    },
    isDefault: true
  };
  profileManager.create(defaultProfile);
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
describe('LLMProfileManager', () => {
  it('creates profile with valid config', () => {});
  it('rejects profile with invalid name', () => {});
  it('updates existing profile', () => {});
  it('deletes profile safely', () => {});
  it('prevents deletion of active profile', () => {});
  it('sets active profile correctly', () => {});
  it('resolves environment variable API keys', () => {});
});
```

### 7.2 Integration Tests

```typescript
describe('Profile CLI Commands', () => {
  it('adds profile via CLI', () => {});
  it('lists profiles with correct formatting', () => {});
  it('exports and imports profiles', () => {});
  it('tests profile health check', () => {});
});
```

### 7.3 TUI Tests

```typescript
describe('ProfileManagerScreen', () => {
  it('renders profile list correctly', () => {});
  it('handles profile selection', () => {});
  it('validates form inputs', () => {});
  it('tests connection from UI', () => {});
});
```

---

## 8. Future Enhancements

### 8.1 Phase 2 Features
- **Profile Templates**: Pre-configured profiles for popular providers
- **Usage Analytics**: Track tokens, costs, and response times per profile
- **Auto-Detection**: Discover local LLM servers automatically
- **Model Discovery**: Query provider for available models
- **Prompt Templates**: Associate prompt templates with profiles
- **Cost Tracking**: Monitor API costs per profile
- **Rate Limiting**: Configure rate limits per profile

### 8.2 Advanced Features
- **Profile Groups**: Organize profiles into groups (dev, prod, testing)
- **Fallback Chains**: Automatic fallback to backup profiles
- **Load Balancing**: Distribute requests across multiple profiles
- **A/B Testing**: Compare model performance automatically
- **Cloud Sync**: Sync profiles across machines
- **Team Sharing**: Share profiles within organization

---

## 9. Success Metrics

- ✅ Users can switch between LLM providers in <5 seconds
- ✅ No manual config file editing required
- ✅ API keys never stored in plaintext
- ✅ Profile export/import works across machines
- ✅ Health checks complete in <2 seconds
- ✅ Zero downtime when switching profiles
- ✅ TUI provides intuitive profile management

---

## 10. References

- [Spec 11: LLM Integration](11-llm-integration.md)
- [Spec 09: CLI Architecture](09-cli-architecture.md)
- [Spec 10: Terminal UI](10-terminal-menu-interface-spec.md)
- OpenAI API Documentation
- Anthropic Claude API Documentation
- LM Studio API Documentation
