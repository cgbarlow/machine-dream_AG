/**
 * CLI Debug Panel Component
 *
 * Real-time monitoring of CLI commands being executed by the TUI
 * Provides robust debugging capability for all backend operations
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface CLICommand {
  id: string;
  command: string;
  args: string[];
  timestamp: Date;
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
  duration?: number;
}

interface CLIDebugPanelProps {
  commands: CLICommand[];
  maxLines?: number;
}

export const CLIDebugPanel: React.FC<CLIDebugPanelProps> = ({
  commands,
  maxLines = 10,
}) => {
  // Show only the most recent commands
  const recentCommands = commands.slice(-maxLines);

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const formatDuration = (ms: number | undefined): string => {
    if (ms === undefined) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (status: CLICommand['status']): string => {
    switch (status) {
      case 'running': return '⚡';
      case 'success': return '✓';
      case 'error': return '✗';
    }
  };

  const getStatusColor = (status: CLICommand['status']): string => {
    switch (status) {
      case 'running': return 'yellow';
      case 'success': return 'green';
      case 'error': return 'red';
    }
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="blue" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">
          🔍 CLI Command Monitor
        </Text>
        <Text color="gray"> (Last {recentCommands.length} commands)</Text>
      </Box>

      {recentCommands.length === 0 ? (
        <Text dimColor>No commands executed yet...</Text>
      ) : (
        <Box flexDirection="column">
          {recentCommands.map((cmd) => (
            <Box key={cmd.id} flexDirection="column" marginBottom={1}>
              {/* Command Header */}
              <Box>
                <Text color="gray">[{formatTimestamp(cmd.timestamp)}]</Text>
                <Text> </Text>
                <Text color={getStatusColor(cmd.status)}>
                  {getStatusIcon(cmd.status)}
                </Text>
                <Text> </Text>
                <Text color="cyan" bold>{cmd.command}</Text>
                {cmd.args.length > 0 && (
                  <>
                    <Text> </Text>
                    <Text color="gray">{cmd.args.join(' ')}</Text>
                  </>
                )}
                {cmd.duration !== undefined && (
                  <>
                    <Text> </Text>
                    <Text color="magenta">({formatDuration(cmd.duration)})</Text>
                  </>
                )}
              </Box>

              {/* Output (if available and not running) */}
              {cmd.status === 'success' && cmd.output && (
                <Box marginLeft={2}>
                  <Text color="green" dimColor>
                    {cmd.output.length > 60
                      ? cmd.output.substring(0, 60) + '...'
                      : cmd.output}
                  </Text>
                </Box>
              )}

              {/* Error (if available) */}
              {cmd.status === 'error' && cmd.error && (
                <Box marginLeft={2}>
                  <Text color="red">
                    Error: {cmd.error.length > 60
                      ? cmd.error.substring(0, 60) + '...'
                      : cmd.error}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          Tip: All CLI commands executed by TUI are logged here for debugging
        </Text>
      </Box>
    </Box>
  );
};
