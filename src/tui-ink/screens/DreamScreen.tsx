/**
 * Dream Cycle Screen
 *
 * Memory consolidation and pattern learning
 */

import React from 'react';
import { Box, Text } from 'ink';

export const DreamScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          💭 Dream Cycle
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
          🌙 5-Phase Dreaming Process
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text bold color="cyan">1. Capture   </Text>
            <Text color="gray">- Log raw experiences</Text>
          </Text>
          <Text>
            <Text bold color="blue">2. Triage    </Text>
            <Text color="gray">- Filter important events</Text>
          </Text>
          <Text>
            <Text bold color="magenta">3. Deep Dream</Text>
            <Text color="gray">- Find patterns & abstract</Text>
          </Text>
          <Text>
            <Text bold color="yellow">4. Pruning   </Text>
            <Text color="gray">- Forget irrelevant data</Text>
          </Text>
          <Text>
            <Text bold color="green">5. Verify    </Text>
            <Text color="gray">- Ensure integrity</Text>
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
          ⚙️  Dream Configuration
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text color="gray">Schedule:         </Text>
            <Text>After each session</Text>
          </Text>
          <Text>
            <Text color="gray">Compression:      </Text>
            <Text color="cyan">10:1 ratio</Text>
          </Text>
          <Text>
            <Text color="gray">Abstraction:      </Text>
            <Text color="yellow">4 levels</Text>
          </Text>
          <Text>
            <Text color="gray">Min Success Rate: </Text>
            <Text color="green">70%</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">
          📊 Dream Status
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            No recent dreams - Run a solving session first
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
