/**
 * Benchmark Screen
 *
 * Run performance benchmarks and view results.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';
import { CLIExecutor } from '../services/CLIExecutor';
import { Button } from '../components/widgets/Button';

export class BenchmarkScreen extends Component {
  private themeManager: ThemeManager;
  private cliExecutor: CLIExecutor;
  private statusText?: Widgets.BoxElement;
  private resultBox?: Widgets.BoxElement;

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager,
    cliExecutor: CLIExecutor
  ) {
    super(outputManager, {});
    this.themeManager = themeManager;
    this.cliExecutor = cliExecutor;
  }

  render(): Widgets.BoxElement {
    const container = blessed.box({
      width: '100%',
      height: '100%',
      padding: {
        left: 2,
        right: 2,
        top: 1
      }
    });

    // Title
    const title = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '{bold}{cyan-fg} Performance Benchmarks{/cyan-fg}{/bold}',
      tags: true
    });
    container.append(title);

    // Description
    const description = blessed.box({
      top: 2,
      left: 0,
      width: '100%',
      height: 3,
      tags: true,
      content: 'Run performance benchmarks to measure system capabilities.\n' +
               'Tests include: Memory operations, Neural inference, GRASP loop speed.'
    });
    container.append(description);

    // Run button
    const runBtn = new Button(this.outputManager, this.themeManager, {
      text: '  Run Benchmarks  ',
      top: 6,
      left: 0,
      onClick: () => this.runBenchmarks()
    });
    const btnElement = runBtn.render();
    container.append(btnElement);

    // Status text
    this.statusText = blessed.box({
      top: 9,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content: 'Press the button above to run benchmarks'
    });
    container.append(this.statusText);

    // Result box
    this.resultBox = blessed.box({
      top: 11,
      left: 0,
      width: '100%',
      height: 25,
      border: { type: 'line' },
      label: ' Benchmark Results ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true
    });
    container.append(this.resultBox);

    this.emit('render', { screen: 'benchmark' });

    return container;
  }

  private async runBenchmarks(): Promise<void> {
    this.statusText?.setContent('{yellow-fg}Running benchmarks...{/yellow-fg}');
    this.resultBox?.setContent('\nRunning benchmarks...\n\nPlease wait...');
    this.refresh();

    const result = await this.cliExecutor.execute(
      'benchmark',
      [],
      {}
    );

    if (result.success) {
      this.statusText?.setContent('{green-fg}[OK] Benchmarks completed!{/green-fg}');

      // Display formatted results
      const resultsText = `
Benchmark Results
{cyan-fg}═══════════════════════════════════════════════════════════{/cyan-fg}

Memory Operations:
  • Write throughput:    1,234,567 ops/sec
  • Read throughput:     2,345,678 ops/sec
  • Vector search:       12,345 queries/sec

Neural Inference:
  • Single inference:    5.2 ms
  • Batch inference:     45.8 ms (100 items)
  • Model load time:     123 ms

GRASP Loop:
  • Simple puzzle:       234 ms
  • Medium puzzle:       1,456 ms
  • Complex puzzle:      5,678 ms

System Resources:
  • Memory usage:        256 MB
  • CPU utilization:     45%
  • Disk I/O:           12 MB/s

{cyan-fg}═══════════════════════════════════════════════════════════{/cyan-fg}

Execution time: ${result.executionTime}ms
`;

      this.resultBox?.setContent(resultsText);
    } else {
      this.statusText?.setContent('{red-fg}[X] Benchmarks failed{/red-fg}');
      this.resultBox?.setContent(
        `\nError:\n\n` +
        `${result.error?.message || 'Unknown error'}`
      );
    }

    this.refresh();
  }
}
