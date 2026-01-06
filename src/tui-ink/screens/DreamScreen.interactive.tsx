/**
 * Interactive Dream Cycle
 *
 * Execute dream cycle with 5-phase progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor, ProgressEvent } from '../services/CLIExecutor.js';
import { TextInputField } from '../components/forms/TextInputField.js';
import { PhaseTracker } from '../components/display/PhaseTracker.js';
import { StatusIndicator } from '../components/display/StatusIndicator.js';

type FocusField = 'sessionId' | 'execute';

export const DreamScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('sessionId');
  const [sessionId, setSessionId] = useState('all-recent');
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<any>(null);
  type PhaseStatus = 'pending' | 'running' | 'complete' | 'error';

  const [phases, setPhases] = useState<Array<{ name: string; status: PhaseStatus; progress: number }>>([
    { name: 'Capture', status: 'pending', progress: 0 },
    { name: 'Triage', status: 'pending', progress: 0 },
    { name: 'Compress', status: 'pending', progress: 0 },
    { name: 'Abstract', status: 'pending', progress: 0 },
    { name: 'Integrate', status: 'pending', progress: 0 }
  ]);

  // Handle keyboard input
  useInput((_input, key) => {
    if (isExecuting) return;

    // Tab navigation
    if (key.tab) {
      const fields: FocusField[] = ['sessionId', 'execute'];
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

  // Update phases based on progress
  useEffect(() => {
    if (!progress) return;

    const newPhases = [...phases];
    const phaseIndex = Math.floor((progress.percentage || 0) / 20);

    newPhases.forEach((phase, index) => {
      if (index < phaseIndex) {
        phase.status = 'complete';
        phase.progress = 100;
      } else if (index === phaseIndex) {
        phase.status = 'running';
        phase.progress = ((progress.percentage || 0) % 20) * 5;
      } else {
        phase.status = 'pending';
        phase.progress = 0;
      }
    });

    setPhases(newPhases);
  }, [progress]);

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress({ type: 'start', message: 'Starting...', percentage: 0 });
    setResult(null);

    await CLIExecutor.executeDream(sessionId, {}, (event) => {
      setProgress(event);

      if (event.type === 'complete') {
        setIsExecuting(false);
        setResult(event.data);
        // Mark all phases complete
        setPhases(phases.map(p => ({ ...p, status: 'complete' as PhaseStatus, progress: 100 })));
      } else if (event.type === 'error') {
        setIsExecuting(false);
        setPhases(phases.map((p) =>
          p.status === 'running' ? { ...p, status: 'error' as PhaseStatus } : p
        ));
      }
    });
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🌙 Dream Cycle
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
          <TextInputField
            label="Session ID(s)"
            value={sessionId}
            onChange={setSessionId}
            onSubmit={() => setFocusField('execute')}
            isFocused={focusField === 'sessionId'}
            placeholder="all-recent"
          />
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
          [Press Enter] Execute Dream Cycle
        </Text>
      </Box>

      {/* 5-Phase Progress */}
      {progress && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={progress.type === 'error' ? 'red' : 'cyan'}
          padding={1}
          marginBottom={1}
        >
          <Box marginBottom={1}>
            <Text bold color="cyan">
              Dream Cycle Progress
            </Text>
          </Box>

          <PhaseTracker phases={phases} showProgress />
        </Box>
      )}

      {/* Results */}
      {result && (
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor="green"
          padding={1}
          marginBottom={1}
        >
          <Text bold color="green">
            ✓ Dream Cycle Complete
          </Text>

          <Box flexDirection="column" marginTop={1}>
            <Text>
              <Text color="gray">Patterns Extracted: </Text>
              <Text color="cyan" bold>{result.patterns?.length || 0}</Text>
            </Text>

            <Text>
              <Text color="gray">Compression Ratio: </Text>
              <Text color="cyan" bold>{result.compressionRatio?.toFixed(1) || 0}:1</Text>
            </Text>

            <Text>
              <Text color="gray">Abstraction Levels: </Text>
              <Text color="cyan" bold>{result.abstractionLadder?.levels?.length || 0}</Text>
            </Text>

            <Text>
              <Text color="gray">Status: </Text>
              <StatusIndicator
                status={result.verificationStatus === 'verified' ? 'success' : 'warning'}
                message={result.verificationStatus}
              />
            </Text>
          </Box>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          Tab: Next field | Enter: Execute
        </Text>
      </Box>
    </Box>
  );
};
