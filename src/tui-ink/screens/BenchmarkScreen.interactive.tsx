/**
 * Interactive Benchmark Suite
 *
 * Run benchmark suites with live progress and results
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { CLIExecutor, ProgressEvent } from '../services/CLIExecutor.js';
import { SelectField } from '../components/forms/SelectField.js';
import { TextInputField } from '../components/forms/TextInputField.js';
import { ProgressBar } from '../components/display/ProgressBar.js';
import { ResultsTable } from '../components/display/ResultsTable.js';

type FocusField = 'suite' | 'count' | 'execute';

export const BenchmarkScreenInteractive: React.FC = () => {
  const [focusField, setFocusField] = useState<FocusField>('suite');
  const [suite, _setSuite] = useState('Standard');
  const [count, setCount] = useState('50');
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [result, setResult] = useState<any>(null);

  const [suites, setSuites] = useState<Array<{ name: string; type: string; description: string; defaultCount: number }>>([]);

  // Load available suites
  useEffect(() => {
    CLIExecutor.listBenchmarkSuites().then(setSuites);
  }, []);

  // Handle keyboard input
  useInput((_input, key) => {
    if (isExecuting) return;

    // Tab navigation
    if (key.tab) {
      const fields: FocusField[] = ['suite', 'count', 'execute'];
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
    setProgress({ type: 'start', message: 'Starting...', percentage: 0 });
    setResult(null);

    const selectedSuite = suites.find(s => s.name === suite);

    await CLIExecutor.executeBenchmark(
      suite,
      selectedSuite?.type || 'grasp-baseline',
      parseInt(count) || 50,
      (event) => {
        setProgress(event);

        if (event.type === 'complete') {
          setIsExecuting(false);
          setResult(event.data);
        } else if (event.type === 'error') {
          setIsExecuting(false);
        }
      }
    );
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          📊 Benchmark Suite
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
            label="Suite"
            value={suite}
            options={suites.map(s => ({ value: s.name, label: `${s.name} - ${s.description}` }))}
            isFocused={focusField === 'suite'}
          />

          <TextInputField
            label="Puzzle Count"
            value={count}
            onChange={setCount}
            onSubmit={() => setFocusField('execute')}
            isFocused={focusField === 'count'}
            placeholder="50"
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
          [Press Enter] Execute Benchmark
        </Text>
      </Box>

      {/* Live Progress */}
      {progress && isExecuting && (
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor="cyan"
          padding={1}
          marginBottom={1}
        >
          <Text bold color="cyan">
            Running Benchmark...
          </Text>

          <Box marginTop={1}>
            <Text>{progress.message}</Text>
          </Box>

          {progress.percentage !== undefined && (
            <Box marginTop={1}>
              <ProgressBar
                current={progress.percentage}
                total={100}
                width={30}
                color="cyan"
              />
            </Box>
          )}
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
            ✓ Benchmark Complete
          </Text>

          <Box flexDirection="column" marginTop={1}>
            <Text>
              <Text color="gray">Total: </Text>
              <Text bold>{result.summary.total}</Text>
              {' | '}
              <Text color="green">Solved: {result.summary.solved}</Text>
              {' | '}
              <Text color="red">Failed: {result.summary.failed}</Text>
            </Text>

            <Text>
              <Text color="gray">Avg Time: </Text>
              <Text color="cyan" bold>{result.summary.avgTime?.toFixed(2) || 0}ms</Text>
            </Text>

            <Text>
              <Text color="gray">Avg Iterations: </Text>
              <Text color="cyan" bold>{result.summary.avIterations?.toFixed(1) || 0}</Text>
            </Text>
          </Box>

          {result.details && result.details.length > 0 && (
            <Box marginTop={1}>
              <ResultsTable
                columns={[
                  { key: 'puzzleId', label: 'Puzzle', width: 15 },
                  { key: 'difficulty', label: 'Difficulty', width: 10 },
                  { key: 'success', label: 'Status', width: 8 },
                  { key: 'solveTime', label: 'Time (ms)', width: 10, align: 'right' },
                  { key: 'iterations', label: 'Iterations', width: 10, align: 'right' }
                ]}
                rows={result.details.slice(0, 5).map((r: any) => ({
                  puzzleId: r.puzzleId,
                  difficulty: r.difficulty,
                  success: r.success ? '✓' : '✗',
                  solveTime: r.solveTime,
                  iterations: r.iterations
                }))}
              />
            </Box>
          )}
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
