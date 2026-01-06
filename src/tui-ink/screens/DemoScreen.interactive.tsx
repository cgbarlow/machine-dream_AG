/**
 * Interactive Demo Player
 *
 * Execute demo scripts with playback controls
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor, ProgressEvent } from '../services/CLIExecutor.js';
import { SelectField } from '../components/forms/SelectField.js';
import { StatusIndicator } from '../components/display/StatusIndicator.js';

type FocusField = 'script' | 'execute';

export const DemoScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('script');
  const [script, _setScript] = useState('stakeholder-presentation');
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);

  const [scripts, setScripts] = useState<Array<{ name: string; description: string; duration: string }>>([]);

  // Load available scripts
  useEffect(() => {
    CLIExecutor.listDemoScripts().then(setScripts);
  }, []);

  // Handle keyboard input
  useInput((_input, key) => {
    if (isExecuting) return;

    // Tab navigation
    if (key.tab) {
      const fields: FocusField[] = ['script', 'execute'];
      const currentIndex = fields.indexOf(focusField);

      if (key.shift) {
        const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
        setFocusField(fields[prevIndex]);
      } else {
        const nextIndex = (currentIndex + 1) % fields.length;
        setFocusField(fields[nextIndex]);
      }
    }

    if (key.return && focusField === 'execute') {
      handleExecute();
    }
  });

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress({ type: 'start', message: 'Starting demo...', percentage: 0 });

    await CLIExecutor.executeDemo(script, {}, (event) => {
      setProgress(event);

      if (event.type === 'complete' || event.type === 'error') {
        setIsExecuting(false);
      }
    });
  };

  const selectedScript = scripts.find(s => s.name === script);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎬 Interactive Demo
        </Text>
      </Box>

      {/* Configuration Form */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="cyan"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          ⚙️  Configuration
        </Text>

        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <SelectField
            label="Demo Script"
            value={script}
            options={scripts.map(s => ({ value: s.name, label: `${s.name} (${s.duration})` }))}
            isFocused={focusField === 'script'}
          />

          {selectedScript && (
            <Box marginTop={1}>
              <Text dimColor>{selectedScript.description}</Text>
            </Box>
          )}
        </Box>
      </Box>

      {/* Execute Button */}
      <Box marginBottom={1}>
        <Text
          bold
          color={focusField === 'execute' ? 'green' : 'white'}
          backgroundColor={focusField === 'execute' ? 'blue' : undefined}
        >
          {focusField === 'execute' ? '▶ ' : '  '}
          [Press Enter] {isExecuting ? 'Playing...' : 'Play Demo'}
        </Text>
      </Box>

      {/* Demo Output */}
      {progress && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={progress.type === 'error' ? 'red' : 'cyan'}
          padding={1}
          marginBottom={1}
        >
          <Box marginBottom={1}>
            <StatusIndicator
              status={isExecuting ? 'running' : progress.type === 'complete' ? 'success' : 'error'}
              message={progress.message}
            />
          </Box>

          {isExecuting && (
            <Box>
              <Text dimColor>[Demo playing... This is a placeholder for real demo output]</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          Tab: Next field | Enter: Play demo
        </Text>
      </Box>
    </Box>
  );
};
