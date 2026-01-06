/**
 * Export Screen
 *
 * Data export and reports
 */

import React from 'react';
import { Box, Text } from 'ink';

export const ExportScreen: React.FC = () => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          📤 Data Export
        </Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="green"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="green">
          📊 Export Options
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text bold color="cyan">1. Session Data    </Text>
            <Text color="gray">- JSON, CSV, Markdown</Text>
          </Text>
          <Text>
            <Text bold color="green">2. Memory Database </Text>
            <Text color="gray">- Full backup</Text>
          </Text>
          <Text>
            <Text bold color="yellow">3. Performance     </Text>
            <Text color="gray">- Metrics & analytics</Text>
          </Text>
          <Text>
            <Text bold color="magenta">4. Dream Results   </Text>
            <Text color="gray">- Pattern summaries</Text>
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
          📁 Export Formats
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text>
            <Text bold>JSON    </Text> <Text color="gray">- Structured, machine-readable</Text>
          </Text>
          <Text>
            <Text bold>CSV     </Text> <Text color="gray">- Spreadsheet compatible</Text>
          </Text>
          <Text>
            <Text bold>Markdown</Text> <Text color="gray">- Human-readable reports</Text>
          </Text>
          <Text>
            <Text bold>SQLite  </Text> <Text color="gray">- Database format</Text>
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <Text bold color="yellow">
          💾 Default Location
        </Text>
        <Box marginLeft={2} marginTop={1}>
          <Text dimColor>
            ~/.machine-dream/exports/
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
