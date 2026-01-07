/**
 * Interactive Puzzle Generator Screen
 *
 * Full interactive puzzle generation interface with real CLI backend (Spec 12)
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { CLIExecutor, ProgressEvent } from '../services/CLIExecutor.js';
import { PuzzleGrid } from '../components/PuzzleGrid.js';

type FocusField =
  | 'seedMode' | 'seedValue' | 'size' | 'difficulty' | 'symmetry'
  | 'validateUniqueness' | 'batchEnabled' | 'batchCount' | 'batchSeedMode'
  | 'batchSeedStart' | 'outputPath' | 'execute';

type SeedMode = 'random' | 'specific';
type GridSize = 4 | 9 | 16 | 25;
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'diabolical';
type Symmetry = 'none' | 'rotational' | 'reflectional' | 'diagonal';
type BatchSeedMode = 'sequential' | 'random';

export const PuzzleGeneratorScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('seedMode');

  // Configuration
  const [seedMode, setSeedMode] = useState<SeedMode>('random');
  const [seedValue, setSeedValue] = useState('12345');
  const [size, setSize] = useState<GridSize>(9);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [symmetry, setSymmetry] = useState<Symmetry>('none');
  const [validateUniqueness, setValidateUniqueness] = useState(true);

  // Batch configuration
  const [batchEnabled, setBatchEnabled] = useState(false);
  const [batchCount, setBatchCount] = useState('10');
  const [batchSeedMode, setBatchSeedMode] = useState<BatchSeedMode>('sequential');
  const [batchSeedStart, setBatchSeedStart] = useState('1000');

  // Output
  const [outputPath, setOutputPath] = useState('puzzles/generated/');

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [generatedPuzzle, setGeneratedPuzzle] = useState<any>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const sizeOptions: GridSize[] = [4, 9, 16, 25];
  const difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard', 'expert', 'diabolical'];
  const symmetryOptions: Symmetry[] = ['none', 'rotational', 'reflectional', 'diagonal'];

  const handleExecute = async () => {
    setIsExecuting(true);
    setProgress({ type: 'start', message: 'Starting...', percentage: 0 });
    setGeneratedPuzzle(null);
    setBatchProgress(null);

    try {
      if (batchEnabled) {
        // Batch generation
        const puzzles = await CLIExecutor.executePuzzleBatch(
          {
            count: parseInt(batchCount) || 10,
            size,
            difficulty,
            symmetry,
            seedMode: batchSeedMode,
            seedStart: parseInt(batchSeedStart) || 1000,
          },
          (event) => {
            setProgress(event);
            if (event.data && typeof event.data === 'object' && 'index' in event.data && 'total' in event.data) {
              setBatchProgress({
                current: (event.data as any).index + 1,
                total: (event.data as any).total
              });
            }
          }
        );

        // Save all puzzles
        for (let i = 0; i < puzzles.length; i++) {
          const fileName = `${outputPath}seed-${puzzles[i].seed}-${difficulty}-${size}x${size}.json`;
          await CLIExecutor.savePuzzleToFile(puzzles[i], fileName);
        }
      } else {
        // Single puzzle generation
        const seed = seedMode === 'random' ? undefined : parseInt(seedValue);
        const puzzle = await CLIExecutor.executePuzzleGenerate(
          {
            seed,
            size,
            difficulty,
            symmetry,
            validateUniqueness,
          },
          (event) => {
            setProgress(event);
            if (event.data && typeof event.data === 'object' && 'puzzle' in event.data) {
              setGeneratedPuzzle((event.data as any).puzzle);
            }
          }
        );

        setGeneratedPuzzle(puzzle);

        // Auto-save
        const fileName = `${outputPath}seed-${puzzle.seed}-${difficulty}-${size}x${size}.json`;
        await CLIExecutor.savePuzzleToFile(puzzle, fileName);
      }
    } catch (error) {
      // Error handled in progress callback
    } finally {
      setIsExecuting(false);
    }
  };

  const cycleSize = () => {
    const currentIndex = sizeOptions.indexOf(size);
    setSize(sizeOptions[(currentIndex + 1) % sizeOptions.length]);
  };

  const cycleDifficulty = () => {
    const currentIndex = difficultyOptions.indexOf(difficulty);
    setDifficulty(difficultyOptions[(currentIndex + 1) % difficultyOptions.length]);
  };

  const cycleSymmetry = () => {
    const currentIndex = symmetryOptions.indexOf(symmetry);
    setSymmetry(symmetryOptions[(currentIndex + 1) % symmetryOptions.length]);
  };

  // Handle keyboard input
  useInput((input, key) => {
    if (isExecuting) return;

    // Tab navigation
    if (key.tab) {
      const fields: FocusField[] = [
        'seedMode', 'seedValue', 'size', 'difficulty', 'symmetry',
        'validateUniqueness', 'batchEnabled', 'batchCount', 'batchSeedMode',
        'batchSeedStart', 'outputPath', 'execute'
      ];
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

    if (input === ' ') {
      if (focusField === 'seedMode') {
        setSeedMode(seedMode === 'random' ? 'specific' : 'random');
      }
      if (focusField === 'size') cycleSize();
      if (focusField === 'difficulty') cycleDifficulty();
      if (focusField === 'symmetry') cycleSymmetry();
      if (focusField === 'validateUniqueness') {
        setValidateUniqueness(!validateUniqueness);
      }
      if (focusField === 'batchEnabled') {
        setBatchEnabled(!batchEnabled);
      }
      if (focusField === 'batchSeedMode') {
        setBatchSeedMode(batchSeedMode === 'sequential' ? 'random' : 'sequential');
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🎲 Puzzle Generator
        </Text>
        <Text color="gray"> - Interactive Mode</Text>
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

        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          {/* Seed Mode */}
          <Box marginBottom={1}>
            <Text color={focusField === 'seedMode' ? 'green' : 'gray'}>
              {focusField === 'seedMode' ? '▶ ' : '  '}
              Seed Mode: {seedMode === 'random' ? '● Random' : '○ Specific'}
            </Text>
          </Box>

          {/* Seed Value */}
          {seedMode === 'specific' && (
            <Box marginBottom={1} paddingLeft={2}>
              <Text color={focusField === 'seedValue' ? 'green' : 'gray'}>
                {focusField === 'seedValue' ? '▶ ' : '  '}
                Seed: {' '}
              </Text>
              {focusField === 'seedValue' ? (
                <TextInput
                  value={seedValue}
                  onChange={setSeedValue}
                  onSubmit={() => setFocusField('size')}
                />
              ) : (
                <Text>{seedValue}</Text>
              )}
            </Box>
          )}

          {/* Grid Size */}
          <Box marginBottom={1}>
            <Text color={focusField === 'size' ? 'green' : 'gray'}>
              {focusField === 'size' ? '▶ ' : '  '}
              Grid Size: <Text color="cyan">{size}×{size}</Text>
            </Text>
          </Box>

          {/* Difficulty */}
          <Box marginBottom={1}>
            <Text color={focusField === 'difficulty' ? 'green' : 'gray'}>
              {focusField === 'difficulty' ? '▶ ' : '  '}
              Difficulty: <Text color="yellow">{difficulty}</Text>
            </Text>
          </Box>

          {/* Symmetry */}
          <Box marginBottom={1}>
            <Text color={focusField === 'symmetry' ? 'green' : 'gray'}>
              {focusField === 'symmetry' ? '▶ ' : '  '}
              Symmetry: <Text color="white">{symmetry}</Text>
            </Text>
          </Box>

          {/* Validate Uniqueness */}
          <Box marginBottom={1}>
            <Text color={focusField === 'validateUniqueness' ? 'green' : 'gray'}>
              {focusField === 'validateUniqueness' ? '▶ ' : '  '}
              Validate Uniqueness: {validateUniqueness ? '✓' : '✗'}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Batch Configuration */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="magenta"
        padding={1}
        marginBottom={1}
      >
        <Text bold color="magenta">
          📦 Batch Generation
        </Text>

        <Box flexDirection="column" paddingLeft={2} paddingTop={1}>
          <Box marginBottom={1}>
            <Text color={focusField === 'batchEnabled' ? 'green' : 'gray'}>
              {focusField === 'batchEnabled' ? '▶ ' : '  '}
              Enabled: {batchEnabled ? '✓' : '✗'}
            </Text>
          </Box>

          {batchEnabled && (
            <>
              <Box marginBottom={1} paddingLeft={2}>
                <Text color={focusField === 'batchCount' ? 'green' : 'gray'}>
                  {focusField === 'batchCount' ? '▶ ' : '  '}
                  Count: {' '}
                </Text>
                {focusField === 'batchCount' ? (
                  <TextInput
                    value={batchCount}
                    onChange={setBatchCount}
                    onSubmit={() => setFocusField('batchSeedMode')}
                  />
                ) : (
                  <Text>{batchCount}</Text>
                )}
              </Box>

              <Box marginBottom={1} paddingLeft={2}>
                <Text color={focusField === 'batchSeedMode' ? 'green' : 'gray'}>
                  {focusField === 'batchSeedMode' ? '▶ ' : '  '}
                  Seed Mode: {batchSeedMode === 'sequential' ? '● Sequential' : '○ Random'}
                </Text>
              </Box>

              {batchSeedMode === 'sequential' && (
                <Box marginBottom={1} paddingLeft={2}>
                  <Text color={focusField === 'batchSeedStart' ? 'green' : 'gray'}>
                    {focusField === 'batchSeedStart' ? '▶ ' : '  '}
                    Seed Start: {' '}
                  </Text>
                  {focusField === 'batchSeedStart' ? (
                    <TextInput
                      value={batchSeedStart}
                      onChange={setBatchSeedStart}
                      onSubmit={() => setFocusField('outputPath')}
                    />
                  ) : (
                    <Text>{batchSeedStart}</Text>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Output Path */}
      <Box marginBottom={1}>
        <Text color={focusField === 'outputPath' ? 'green' : 'gray'}>
          {focusField === 'outputPath' ? '▶ ' : '  '}
          Output: {' '}
        </Text>
        {focusField === 'outputPath' ? (
          <TextInput
            value={outputPath}
            onChange={setOutputPath}
            onSubmit={() => setFocusField('execute')}
          />
        ) : (
          <Text>{outputPath}</Text>
        )}
      </Box>

      {/* Execute Button */}
      <Box marginBottom={1}>
        <Text
          bold
          color={focusField === 'execute' ? 'green' : 'gray'}
          backgroundColor={focusField === 'execute' ? 'green' : undefined}
          inverse={focusField === 'execute'}
        >
          {focusField === 'execute' ? '▶ ' : '  '}
          [ Generate ]
        </Text>
      </Box>

      {/* Progress */}
      {progress && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={progress.type === 'error' ? 'red' : 'green'}
          padding={1}
          marginBottom={1}
        >
          <Text bold color={progress.type === 'error' ? 'red' : 'green'}>
            {progress.type === 'error' ? '✗ Error' :
             progress.type === 'complete' ? '✓ Complete' :
             '⚙ Processing'}
          </Text>
          <Box marginLeft={2}>
            <Text>{progress.message}</Text>
          </Box>

          {batchProgress && (
            <Box marginLeft={2}>
              <Text color="cyan">
                Progress: {batchProgress.current}/{batchProgress.total}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Generated Puzzle Preview */}
      {generatedPuzzle && !batchEnabled && (
        <Box flexDirection="row" marginBottom={1}>
          <Box flexDirection="column" marginRight={2}>
            <Text bold color="green">📊 Generated Puzzle</Text>
            <PuzzleGrid grid={generatedPuzzle.grid} />
          </Box>

          <Box flexDirection="column">
            <Text bold color="cyan">Metadata</Text>
            <Box flexDirection="column" paddingLeft={1} paddingTop={1}>
              <Text><Text color="gray">Seed:</Text> {generatedPuzzle.seed}</Text>
              <Text><Text color="gray">Size:</Text> {generatedPuzzle.size}×{generatedPuzzle.size}</Text>
              <Text><Text color="gray">Difficulty:</Text> {generatedPuzzle.targetDifficulty}</Text>
              <Text><Text color="gray">Clues:</Text> {generatedPuzzle.clueCount}/{generatedPuzzle.size * generatedPuzzle.size}</Text>
              <Text><Text color="gray">Gen Time:</Text> {generatedPuzzle.generationTimeMs}ms</Text>
              <Text><Text color="gray">Retries:</Text> {generatedPuzzle.retryCount}</Text>
              <Text>
                <Text color="gray">Unique:</Text> {generatedPuzzle.hasUniqueSolution ? '✓ Yes' : '✗ No'}
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>
          [Tab] Navigate | [Space] Toggle | [Enter] Execute | [Esc] Back
        </Text>
      </Box>
    </Box>
  );
};
