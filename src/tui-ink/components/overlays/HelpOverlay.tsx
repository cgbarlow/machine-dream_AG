/**
 * HelpOverlay Component
 *
 * Context-sensitive help overlay triggered with ? key.
 * Shows keyboard shortcuts and features for the current screen.
 *
 * Spec: 14-console-menu-interface-spec.md (Section 6.3)
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpOverlayProps {
  screen: string;
  onClose: () => void;
}

interface HelpSection {
  title: string;
  shortcuts: Array<{ key: string; action: string }>;
  features: string[];
}

// Context-sensitive help content for each screen
const helpContent: Record<string, HelpSection> = {
  Home: {
    title: 'Home Screen',
    shortcuts: [
      { key: 'S', action: 'Open Solve screen' },
      { key: 'G', action: 'Open Puzzle Generator' },
      { key: 'L', action: 'Open LLM Play screen' },
      { key: 'M', action: 'Open Memory browser' },
      { key: 'T', action: 'Open Console' },
      { key: '?', action: 'Show this help' },
      { key: '`', action: 'Toggle console overlay' },
    ],
    features: [
      'Dashboard with system status',
      'Real-time memory statistics',
      'Quick access to all features',
    ],
  },
  Solve: {
    title: 'Solve Puzzle Screen',
    shortcuts: [
      { key: 'Tab', action: 'Navigate form fields' },
      { key: 'Space', action: 'Toggle checkboxes' },
      { key: 'Enter', action: 'Execute solve' },
      { key: 'Esc', action: 'Return to menu' },
    ],
    features: [
      'Configure puzzle solving parameters',
      'Enable memory system for learning',
      'Real-time progress visualization',
      'Grid and metrics display',
    ],
  },
  LLM: {
    title: 'LLM Play Screen',
    shortcuts: [
      { key: 'Tab', action: 'Navigate form fields' },
      { key: 'Space', action: 'Toggle memory' },
      { key: 'Enter', action: 'Start LLM play' },
      { key: 'P/S', action: 'Switch view mode' },
    ],
    features: [
      'LLM plays Sudoku puzzles',
      'Real-time move tracking',
      'Accuracy and progress metrics',
      'Move history with reasoning',
    ],
  },
  Memory: {
    title: 'Memory Browser Screen',
    shortcuts: [
      { key: 'Tab', action: 'Navigate fields' },
      { key: 'Enter', action: 'Execute search' },
      { key: '↑↓', action: 'Scroll results' },
    ],
    features: [
      'Browse AgentDB memory entries',
      'Search patterns and strategies',
      'View memory statistics',
      'Inspect entry details',
    ],
  },
  Dream: {
    title: 'Dream Consolidation Screen',
    shortcuts: [
      { key: 'Tab', action: 'Navigate fields' },
      { key: 'Enter', action: 'Start dream cycle' },
    ],
    features: [
      '5-phase dream consolidation',
      'Memory pattern extraction',
      'Skill library building',
      'Phase-by-phase progress tracking',
    ],
  },
  Console: {
    title: 'Console Screen',
    shortcuts: [
      { key: 'Tab', action: 'Switch focus (output ↔ input)' },
      { key: 'Enter', action: 'Execute command' },
      { key: '↑↓', action: 'Command history / Scroll' },
      { key: 'Esc', action: 'Clear input' },
    ],
    features: [
      'Direct CLI command entry',
      'Captured output display',
      'Command history navigation',
      'All CLI commands available',
    ],
  },
};

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ screen, onClose }) => {
  const help = helpContent[screen] || helpContent.Home;

  // Handle keyboard input for closing overlay
  useInput((input, key) => {
    if (input === '?' || key.escape) {
      onClose();
    }
  });

  return (
    <Box
      width={60}
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
      backgroundColor="black"
      paddingX={2}
      paddingY={1}
    >
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color="magenta">
          ? Help - {help.title}
        </Text>
        <Text dimColor>? or Esc to close</Text>
      </Box>

      {/* Keyboard Shortcuts */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan" underline>
          Keyboard Shortcuts:
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {help.shortcuts.map((shortcut, index) => (
            <Text key={index}>
              <Text color="green">{shortcut.key.padEnd(10)}</Text>
              <Text dimColor>- {shortcut.action}</Text>
            </Text>
          ))}
        </Box>
      </Box>

      {/* Features */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow" underline>
          Features:
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {help.features.map((feature, index) => (
            <Text key={index} dimColor>
              • {feature}
            </Text>
          ))}
        </Box>
      </Box>

      {/* Global Shortcuts */}
      <Box flexDirection="column">
        <Text bold color="gray" underline>
          Global Shortcuts:
        </Text>
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>
            <Text color="green">?</Text> - Help overlay
          </Text>
          <Text dimColor>
            <Text color="green">`</Text> - Console overlay
          </Text>
          <Text dimColor>
            <Text color="green">Ctrl+C</Text> - Exit application
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
