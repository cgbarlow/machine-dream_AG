/**
 * AI Model Profile Manager Screen
 *
 * View AI model connection profiles
 * Spec 13: LLM Profile Management
 */

import React from 'react';
import { Box, Text } from 'ink';

export const ProfileManagerScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🤖 AI Model Profile Manager
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          📋 Available Profiles
        </Text>
        <Box marginY={1}>
          <Box flexDirection="column" marginLeft={2}>
          <Text>
            <Text color="green">▶ </Text>
            <Text bold>lm-studio-local</Text>
            <Text color="gray"> (Active)</Text>
          </Text>
          <Text dimColor>
            {'  '}Provider: LM Studio | Model: qwen3-30b | Last used: 5m ago
          </Text>

          <Box marginY={1}>
            <Text>
              <Text color="gray">  </Text>
              <Text>openai-gpt4</Text>
            </Text>
          </Box>
          <Text dimColor>
            {'  '}Provider: OpenAI | Model: gpt-4 | Last used: 2h ago
          </Text>

          <Box marginY={1}>
            <Text>
              <Text color="gray">  </Text>
              <Text>anthropic-claude</Text>
            </Text>
          </Box>
          <Text dimColor>
            {'  '}Provider: Anthropic | Model: claude-3-opus | Last used: 1d ago
          </Text>
          </Box>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="yellow"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="yellow">
          ℹ️  Profile Details
        </Text>
        <Box marginY={1}>
          <Box flexDirection="column" marginLeft={2}>
            {/* Profile details displayed in interactive mode */}
          </Box>
        </Box>
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        <Box>
          <Text>
            <Text color="gray">Name:        </Text>
            <Text bold>lm-studio-local</Text>
          </Text>
          <Text>
            <Text color="gray">Provider:    </Text>
            <Text color="cyan">LM Studio</Text>
          </Text>
          <Text>
            <Text color="gray">Model:       </Text>
            <Text>qwen3-30b</Text>
          </Text>
          <Text>
            <Text color="gray">Base URL:    </Text>
            <Text>http://localhost:1234/v1</Text>
          </Text>
          <Text>
            <Text color="gray">Temperature: </Text>
            <Text color="yellow">0.7</Text>
          </Text>
          <Text>
            <Text color="gray">Max Tokens:  </Text>
            <Text color="yellow">2048</Text>
          </Text>
          <Text>
            <Text color="gray">Usage:       </Text>
            <Text>42 times</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="magenta">
          🔧 Manage Profiles
        </Text>
        <Box marginY={1}>
          <Box marginLeft={2}>
          <Text dimColor>
            Use interactive mode for profile management (Shift+Tab)
          </Text>
          <Text dimColor>
            Or CLI: <Text bold>machine-dream llm profile &lt;command&gt;</Text>
          </Text>
          </Box>
        </Box>
      </Box>

      <Box marginY={1}>
        <Text dimColor>
          Storage: ~/.machine-dream/llm-profiles.json
        </Text>
      </Box>
    </Box>
  );
};
