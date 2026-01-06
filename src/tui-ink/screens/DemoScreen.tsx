/**
 * Demo Screen
 *
 * Interactive demonstrations and tutorials
 */

import React from 'react';
import { Box, Text } from 'ink';

export const DemoScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎮 Interactive Demos
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
          🎬 Available Demonstrations
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text bold color="cyan">1. GRASP Loop      </Text>
            <Text color="gray">- Watch solving in action</Text>
          </Text>
          <Text>
            <Text bold color="green">2. Memory System   </Text>
            <Text color="gray">- See AgentDB in use</Text>
          </Text>
          <Text>
            <Text bold color="yellow">3. Neural Learning </Text>
            <Text color="gray">- Pattern recognition demo</Text>
          </Text>
          <Text>
            <Text bold color="magenta">4. Dream Cycle     </Text>
            <Text color="gray">- 5-phase walkthrough</Text>
          </Text>
          <Text>
            <Text bold color="blue">5. Full Pipeline   </Text>
            <Text color="gray">- End-to-end demonstration</Text>
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
          ℹ️  Demo Features
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>• <Text color="green">Real-time visualization</Text></Text>
          <Text>• <Text color="yellow">Step-by-step explanations</Text></Text>
          <Text>• <Text color="cyan">Pause and resume controls</Text></Text>
          <Text>• <Text color="magenta">Interactive exploration</Text></Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">
          💡 Get Started
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            Select a demo above or run: <Text bold>machine-dream demo</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
