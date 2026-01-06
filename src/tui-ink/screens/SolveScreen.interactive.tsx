/**
 * Interactive Solve Screen
 *
 * Full interactive puzzle solving interface with real CLI backend
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { CLIExecutor, SolveParams, ProgressEvent } from '../services/CLIExecutor.js';
import { PuzzleGrid } from '../components/PuzzleGrid.js';
import { SolveProgress } from '../components/SolveProgress.js';

type FocusField = 'puzzleFile' | 'memorySystem' | 'enableRL' | 'enableReflexion' | 'maxIterations' | 'execute';

export const SolveScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('puzzleFile');
  const [puzzleFile, setPuzzleFile] = useState('puzzles/easy-01.json');
  const [memorySystem] = useState<'agentdb' | 'reasoningbank'>('agentdb');
  const [enableRL, setEnableRL] = useState(true);
  const [enableReflexion, setEnableReflexion] = useState(true);
  const [maxIterations, setMaxIterations] = useState('100');
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [availablePuzzles, setAvailablePuzzles] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Update elapsed time when executing
  useEffect(() => {
    if (!isExecuting) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isExecuting, startTime]);

  // Load available puzzles
  useEffect(() => {
    CLIExecutor.listPuzzleFiles().then(setAvailablePuzzles);
  }, []);

  const handleExecute = async () => {
    setIsExecuting(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setProgress({ type: 'start', message: 'Starting...', percentage: 0 });

    const params: SolveParams = {
      puzzleFile,
      memorySystem,
      enableRL,
      enableReflexion,
      maxIterations: parseInt(maxIterations) || 100,
    };

    await CLIExecutor.executeSolve(params, (event) => {
      setProgress(event);
      if (event.type === 'complete' || event.type === 'error') {
        setIsExecuting(false);
      }
    });
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (isExecuting) return;

    // Tab navigation (forward and backward with Shift)
    if (key.tab) {
      const fields: FocusField[] = ['puzzleFile', 'memorySystem', 'enableRL', 'enableReflexion', 'maxIterations', 'execute'];
      const currentIndex = fields.indexOf(focusField);

      if (key.shift) {
        // Shift-Tab: Go to previous field
        const prevIndex = currentIndex === 0 ? fields.length - 1 : currentIndex - 1;
        setFocusField(fields[prevIndex]);
      } else {
        // Tab: Go to next field
        const nextIndex = (currentIndex + 1) % fields.length;
        setFocusField(fields[nextIndex]);
      }
    }

    if (key.return && focusField === 'execute') {
      handleExecute();
    }

    if (input === ' ') {
      if (focusField === 'enableRL') setEnableRL(!enableRL);
      if (focusField === 'enableReflexion') setEnableReflexion(!enableReflexion);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🧩 Puzzle Solver
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
          {/* Puzzle File */}
          <Box marginBottom={1}>
            <Text color={focusField === 'puzzleFile' ? 'green' : 'gray'}>
              {focusField === 'puzzleFile' ? '▶ ' : '  '}
              Puzzle File:{' '}
            </Text>
            {focusField === 'puzzleFile' ? (
              <TextInput
                value={puzzleFile}
                onChange={setPuzzleFile}
                onSubmit={() => setFocusField('memorySystem')}
              />
            ) : (
              <Text>{puzzleFile}</Text>
            )}
          </Box>

          {/* Memory System */}
          <Box marginBottom={1}>
            <Text color={focusField === 'memorySystem' ? 'green' : 'gray'}>
              {focusField === 'memorySystem' ? '▶ ' : '  '}
              Memory System: <Text color="cyan">{memorySystem}</Text>
            </Text>
          </Box>

          {/* Enable RL */}
          <Box marginBottom={1}>
            <Text color={focusField === 'enableRL' ? 'green' : 'gray'}>
              {focusField === 'enableRL' ? '▶ ' : '  '}
              Enable RL: {enableRL ? <Text color="green">✓</Text> : <Text color="red">✗</Text>}
            </Text>
          </Box>

          {/* Enable Reflexion */}
          <Box marginBottom={1}>
            <Text color={focusField === 'enableReflexion' ? 'green' : 'gray'}>
              {focusField === 'enableReflexion' ? '▶ ' : '  '}
              Enable Reflexion: {enableReflexion ? <Text color="green">✓</Text> : <Text color="red">✗</Text>}
            </Text>
          </Box>

          {/* Max Iterations */}
          <Box marginBottom={1}>
            <Text color={focusField === 'maxIterations' ? 'green' : 'gray'}>
              {focusField === 'maxIterations' ? '▶ ' : '  '}
              Max Iterations:{' '}
            </Text>
            {focusField === 'maxIterations' ? (
              <TextInput
                value={maxIterations}
                onChange={setMaxIterations}
                onSubmit={() => setFocusField('execute')}
              />
            ) : (
              <Text>{maxIterations}</Text>
            )}
          </Box>
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
          [Press Enter] Execute Solve
        </Text>
      </Box>

      {/* Live Visualization */}
      {progress && (progress.type === 'iteration' || progress.type === 'complete') && progress.currentGrid && (
        <Box flexDirection="row" gap={2}>
          {/* Puzzle Grid */}
          <PuzzleGrid grid={progress.currentGrid} size={9} />

          {/* Progress Metrics */}
          <SolveProgress
            isRunning={isExecuting}
            iteration={progress.iteration || 0}
            maxIterations={parseInt(maxIterations) || 100}
            cellsFilled={progress.cellsFilled || 0}
            totalCells={81}
            currentStrategy={progress.currentStrategy}
            elapsedTime={elapsedTime}
            status={progress.type === 'complete' ? 'success' : 'running'}
            errorMessage={undefined}
          />
        </Box>
      )}

      {/* Simple Progress (before visualization) */}
      {progress && progress.type !== 'iteration' && progress.type !== 'complete' && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={progress.type === 'error' ? 'red' : 'cyan'}
          padding={1}
        >
          <Text bold color={progress.type === 'error' ? 'red' : 'cyan'}>
            {progress.message}
          </Text>
          {progress.percentage !== undefined && (
            <Text color="cyan">
              Progress: {progress.percentage}%
            </Text>
          )}
        </Box>
      )}

      {/* Available Puzzles */}
      {availablePuzzles.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Available puzzles: {availablePuzzles.join(', ')}</Text>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          Tab: Next field | Space: Toggle | Enter: Execute
        </Text>
      </Box>
    </Box>
  );
};
