/**
 * Interactive LLM Screen
 *
 * Full interactive LLM Sudoku player with real CLI backend and debugging
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { CLIExecutor, ProgressEvent } from '../services/CLIExecutor.js';
import { PuzzleGrid } from '../components/PuzzleGrid.js';
import { LLMProgress } from '../components/LLMProgress.js';
import { CLIDebugPanel, CLICommand } from '../components/CLIDebugPanel.js';
import { MoveHistory, MoveEntry } from '../components/MoveHistory.js';

type FocusField = 'puzzleFile' | 'memoryEnabled' | 'model' | 'maxMoves' | 'execute';
type ViewMode = 'play' | 'stats' | 'dream' | 'benchmark';

export const LLMScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('puzzleFile');
  const [viewMode, setViewMode] = useState<ViewMode>('play');

  // Configuration
  const [puzzleFile, setPuzzleFile] = useState('puzzles/easy-01.json');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [model, setModel] = useState('qwen3-30b');
  const [maxMoves, setMaxMoves] = useState('200');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [availablePuzzles, setAvailablePuzzles] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // CLI debugging
  const [cliCommands, setCLICommands] = useState<CLICommand[]>([]);

  // Move history
  const [moveHistory, setMoveHistory] = useState<MoveEntry[]>([]);

  // Statistics
  const [stats, setStats] = useState<any>(null);

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

  // Add CLI command to debug panel
  const logCLICommand = (command: string, args: string[] = []) => {
    const cmd: CLICommand = {
      id: `cmd-${Date.now()}-${Math.random()}`,
      command,
      args,
      timestamp: new Date(),
      status: 'running',
    };
    setCLICommands(prev => [...prev, cmd]);
    return cmd.id;
  };

  // Update CLI command status
  const updateCLICommand = (id: string, update: Partial<CLICommand>) => {
    setCLICommands(prev => prev.map(cmd =>
      cmd.id === id ? { ...cmd, ...update } : cmd
    ));
  };

  const handleExecutePlay = async () => {
    setIsExecuting(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setProgress({ type: 'start', message: 'Starting LLM player...', percentage: 0 });
    setMoveHistory([]);

    const cmdId = logCLICommand('llm play', [
      puzzleFile,
      memoryEnabled ? '' : '--no-memory',
      `--model ${model}`,
      `--max-moves ${maxMoves}`,
    ].filter(Boolean));

    const startTime = Date.now();

    try {
      await CLIExecutor.executeLLMPlay(
        puzzleFile,
        { memoryEnabled, model, maxMoves: parseInt(maxMoves) || 200 },
        (event) => {
          setProgress(event);

          // Parse move data for history
          if (event.type === 'iteration' && event.data) {
            const { moveNumber, row, col, value, reasoning, outcome, error } = event.data;
            if (moveNumber !== undefined) {
              setMoveHistory(prev => [
                ...prev,
                {
                  moveNumber,
                  row: row || 0,
                  col: col || 0,
                  value: value || 0,
                  reasoning: reasoning || '',
                  outcome: outcome || 'invalid',
                  error,
                },
              ]);
            }
          }

          if (event.type === 'complete' || event.type === 'error') {
            setIsExecuting(false);
            const duration = Date.now() - startTime;
            updateCLICommand(cmdId, {
              status: event.type === 'complete' ? 'success' : 'error',
              output: event.message,
              error: event.type === 'error' ? event.message : undefined,
              duration,
            });
          }
        }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      updateCLICommand(cmdId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      setIsExecuting(false);
    }
  };

  const handleExecuteDream = async () => {
    setIsExecuting(true);
    setStartTime(Date.now());
    setProgress({ type: 'start', message: 'Running consolidation...', percentage: 0 });

    const cmdId = logCLICommand('llm dream');
    const startTime = Date.now();

    try {
      await CLIExecutor.executeLLMDream((event) => {
        setProgress(event);
        if (event.type === 'complete' || event.type === 'error') {
          setIsExecuting(false);
          const duration = Date.now() - startTime;
          updateCLICommand(cmdId, {
            status: event.type === 'complete' ? 'success' : 'error',
            output: event.message,
            error: event.type === 'error' ? event.message : undefined,
            duration,
          });
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateCLICommand(cmdId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      setIsExecuting(false);
    }
  };

  const handleExecuteBenchmark = async () => {
    setIsExecuting(true);
    setStartTime(Date.now());
    setProgress({ type: 'start', message: 'Running benchmark...', percentage: 0 });

    const cmdId = logCLICommand('llm benchmark', [puzzleFile]);
    const startTime = Date.now();

    try {
      await CLIExecutor.executeLLMBenchmark([puzzleFile], (event) => {
        setProgress(event);
        if (event.type === 'complete' || event.type === 'error') {
          setIsExecuting(false);
          const duration = Date.now() - startTime;
          updateCLICommand(cmdId, {
            status: event.type === 'complete' ? 'success' : 'error',
            output: event.message,
            error: event.type === 'error' ? event.message : undefined,
            duration,
          });
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateCLICommand(cmdId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      setIsExecuting(false);
    }
  };

  const handleLoadStats = async () => {
    const cmdId = logCLICommand('llm stats');
    const startTime = Date.now();

    try {
      const statsData = await CLIExecutor.getLLMStats();
      setStats(statsData);
      const duration = Date.now() - startTime;
      updateCLICommand(cmdId, {
        status: 'success',
        output: `Loaded stats: ${statsData.totalPuzzles} puzzles`,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateCLICommand(cmdId, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
    }
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (isExecuting) return;

    // Tab navigation
    if (key.tab) {
      const fields: FocusField[] = ['puzzleFile', 'memoryEnabled', 'model', 'maxMoves', 'execute'];
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
      if (viewMode === 'play') handleExecutePlay();
      else if (viewMode === 'dream') handleExecuteDream();
      else if (viewMode === 'benchmark') handleExecuteBenchmark();
      else if (viewMode === 'stats') handleLoadStats();
    }

    if (input === ' ' && focusField === 'memoryEnabled') {
      setMemoryEnabled(!memoryEnabled);
    }

    // View mode switching
    if (input === 'p') setViewMode('play');
    if (input === 's') setViewMode('stats');
    if (input === 'd') setViewMode('dream');
    if (input === 'b') setViewMode('benchmark');
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          🤖 LLM Sudoku Player
        </Text>
        <Text color="gray"> | Mode: </Text>
        <Text bold color="cyan">{viewMode.toUpperCase()}</Text>
      </Box>

      {/* View Mode Selector */}
      <Box marginBottom={1}>
        <Text>
          <Text color={viewMode === 'play' ? 'green' : 'gray'}>[P]lay</Text>
          <Text> | </Text>
          <Text color={viewMode === 'stats' ? 'green' : 'gray'}>[S]tats</Text>
          <Text> | </Text>
          <Text color={viewMode === 'dream' ? 'green' : 'gray'}>[D]ream</Text>
          <Text> | </Text>
          <Text color={viewMode === 'benchmark' ? 'green' : 'gray'}>[B]enchmark</Text>
        </Text>
      </Box>

      {/* Configuration Form (Play/Benchmark modes) */}
      {(viewMode === 'play' || viewMode === 'benchmark') && (
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor="magenta"
          padding={1}
          marginBottom={1}
        >
          <Text bold color="magenta">
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
                  onSubmit={() => setFocusField('memoryEnabled')}
                />
              ) : (
                <Text>{puzzleFile}</Text>
              )}
            </Box>

            {/* Memory Enabled */}
            <Box marginBottom={1}>
              <Text color={focusField === 'memoryEnabled' ? 'green' : 'gray'}>
                {focusField === 'memoryEnabled' ? '▶ ' : '  '}
                Memory: {memoryEnabled ? <Text color="green">✓ ON</Text> : <Text color="yellow">✗ OFF</Text>}
              </Text>
            </Box>

            {/* Model */}
            <Box marginBottom={1}>
              <Text color={focusField === 'model' ? 'green' : 'gray'}>
                {focusField === 'model' ? '▶ ' : '  '}
                Model:{' '}
              </Text>
              {focusField === 'model' ? (
                <TextInput
                  value={model}
                  onChange={setModel}
                  onSubmit={() => setFocusField('maxMoves')}
                />
              ) : (
                <Text>{model}</Text>
              )}
            </Box>

            {/* Max Moves */}
            <Box marginBottom={1}>
              <Text color={focusField === 'maxMoves' ? 'green' : 'gray'}>
                {focusField === 'maxMoves' ? '▶ ' : '  '}
                Max Moves:{' '}
              </Text>
              {focusField === 'maxMoves' ? (
                <TextInput
                  value={maxMoves}
                  onChange={setMaxMoves}
                  onSubmit={() => setFocusField('execute')}
                />
              ) : (
                <Text>{maxMoves}</Text>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Execute Button */}
      <Box marginBottom={1}>
        <Text
          bold
          color={focusField === 'execute' ? 'green' : 'white'}
          backgroundColor={focusField === 'execute' ? 'magenta' : undefined}
        >
          {focusField === 'execute' ? '▶ ' : '  '}
          [Press Enter] Execute {viewMode.toUpperCase()}
        </Text>
      </Box>

      {/* Live Visualization (Play mode) */}
      {viewMode === 'play' && progress && (progress.type === 'iteration' || progress.type === 'complete') && progress.currentGrid && (
        <Box flexDirection="row" gap={2} marginBottom={1}>
          {/* Puzzle Grid */}
          <PuzzleGrid grid={progress.currentGrid} size={9} />

          {/* Progress Metrics */}
          <LLMProgress
            isRunning={isExecuting}
            moveNumber={progress.data?.moveNumber || 0}
            maxMoves={parseInt(maxMoves) || 200}
            correctMoves={progress.data?.correctMoves || 0}
            invalidMoves={progress.data?.invalidMoves || 0}
            wrongMoves={progress.data?.wrongMoves || 0}
            cellsFilled={progress.cellsFilled || 0}
            totalCells={81}
            currentMove={progress.data?.currentMove}
            elapsedTime={elapsedTime}
            status={progress.type === 'complete' ? 'success' : 'running'}
            errorMessage={undefined}
            memoryEnabled={memoryEnabled}
          />
        </Box>
      )}

      {/* Move History (Play mode) */}
      {viewMode === 'play' && moveHistory.length > 0 && (
        <Box marginBottom={1}>
          <MoveHistory moves={moveHistory} maxLines={6} />
        </Box>
      )}

      {/* Stats Display */}
      {viewMode === 'stats' && stats && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="cyan"
          padding={1}
          marginBottom={1}
        >
          <Text bold color="cyan">📊 LLM Statistics</Text>
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            <Text>
              <Text color="gray">Total Puzzles: </Text>
              <Text color="cyan" bold>{stats.totalPuzzles}</Text>
            </Text>
            <Text>
              <Text color="gray">Puzzles Solved: </Text>
              <Text color="green" bold>{stats.puzzlesSolved}</Text>
            </Text>
            <Text>
              <Text color="gray">Solve Rate: </Text>
              <Text color="yellow" bold>{stats.solveRate}%</Text>
            </Text>
            <Text>
              <Text color="gray">Avg Moves to Solve: </Text>
              <Text color="cyan" bold>{stats.avgMovesToSolve}</Text>
            </Text>
            <Text>
              <Text color="gray">Overall Accuracy: </Text>
              <Text color="green" bold>{stats.overallAccuracy}%</Text>
            </Text>
          </Box>
        </Box>
      )}

      {/* Simple Progress */}
      {progress && progress.type !== 'iteration' && progress.type !== 'complete' && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={progress.type === 'error' ? 'red' : 'magenta'}
          padding={1}
          marginBottom={1}
        >
          <Text bold color={progress.type === 'error' ? 'red' : 'magenta'}>
            {progress.message}
          </Text>
          {progress.percentage !== undefined && (
            <Text color="cyan">
              Progress: {progress.percentage}%
            </Text>
          )}
        </Box>
      )}

      {/* CLI Debug Panel */}
      <Box marginBottom={1}>
        <CLIDebugPanel commands={cliCommands} maxLines={8} />
      </Box>

      {/* Available Puzzles */}
      {availablePuzzles.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Available: {availablePuzzles.slice(0, 3).join(', ')}{availablePuzzles.length > 3 ? '...' : ''}</Text>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          Tab: Next | Space: Toggle | Enter: Execute | P/S/D/B: Switch mode
        </Text>
      </Box>
    </Box>
  );
};
