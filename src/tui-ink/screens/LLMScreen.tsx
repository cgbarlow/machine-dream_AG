/**
 * LLM Sudoku Player Screen (Static Layout)
 *
 * Configuration overview for LLM-powered Sudoku solving
 */

import React from 'react';
import { Box, Text } from 'ink';

export const LLMScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          🤖 LLM Sudoku Player
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="magenta"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="magenta">
          ⚙️  LLM Configuration
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">LM Studio URL:   </Text>
            <Text color="white">http://localhost:1234/v1</Text>
          </Text>
          <Text>
            <Text color="gray">Model:           </Text>
            <Text color="cyan">qwen3-30b</Text>
          </Text>
          <Text>
            <Text color="gray">Temperature:     </Text>
            <Text color="yellow">0.7</Text>
            <Text dimColor> (exploration)</Text>
          </Text>
          <Text>
            <Text color="gray">Max Tokens:      </Text>
            <Text color="cyan">1024</Text>
          </Text>
          <Text>
            <Text color="gray">Memory:          </Text>
            <Text color="green">✓ Enabled</Text>
            <Text dimColor> (AgentDB)</Text>
          </Text>
          <Text>
            <Text color="gray">Max History:     </Text>
            <Text color="cyan">20 moves</Text>
          </Text>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          🎮 Play Modes
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            • <Text color="green" bold>Memory ON</Text> - Learn from experience (default)
          </Text>
          <Text>
            • <Text color="yellow" bold>Memory OFF</Text> - Baseline mode (--no-memory)
          </Text>
          <Text>
            • <Text color="magenta" bold>Benchmark</Text> - A/B testing (ON vs OFF)
          </Text>
          <Text>
            • <Text color="cyan" bold>Consolidation</Text> - Pattern synthesis (dreaming)
          </Text>
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
          🧠 Learning System
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="cyan">Move Validation:</Text> <Text dimColor>Correct / Invalid / Wrong</Text>
          </Text>
          <Text>
            <Text color="cyan">Experience Storage:</Text> <Text dimColor>AgentDB ReasoningBank</Text>
          </Text>
          <Text>
            <Text color="cyan">Few-Shot Examples:</Text> <Text dimColor>Auto-generated from success</Text>
          </Text>
          <Text>
            <Text color="cyan">Pattern Analysis:</Text> <Text dimColor>Error grouping & insights</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">
          📊 Available Commands
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="cyan" bold>Play:</Text> <Text dimColor>Solve puzzle with LLM reasoning</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>Stats:</Text> <Text dimColor>View performance metrics</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>Dream:</Text> <Text dimColor>Run consolidation (pattern synthesis)</Text>
          </Text>
          <Text>
            <Text color="cyan" bold>Benchmark:</Text> <Text dimColor>Scientific A/B testing</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="red">
          ⚠️  Requirements
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text dimColor>
            • LM Studio must be running on localhost:1234
          </Text>
          <Text dimColor>
            • Load a capable model (Qwen3 30B recommended)
          </Text>
          <Text dimColor>
            • No deterministic fallback - pure LLM reasoning
          </Text>
          <Text dimColor>
            • No hints - LLM must learn through struggle
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
