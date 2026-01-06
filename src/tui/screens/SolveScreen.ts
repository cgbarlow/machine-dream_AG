/**
 * Solve Screen
 *
 * Form for solving puzzles with the GRASP loop.
 */

import blessed, { Widgets } from 'neo-blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';
import { CLIExecutor } from '../services/CLIExecutor';
import { Form } from '../components/widgets/Form';
import { TextField } from '../components/widgets/TextField';
import { Button } from '../components/widgets/Button';
import { SolveFormData } from '../types';

export class SolveScreen extends Component {
  private themeManager: ThemeManager;
  private cliExecutor: CLIExecutor;
  private form?: Form;
  private progressBox?: Widgets.BoxElement;
  private resultBox?: Widgets.BoxElement;
  private statusText?: Widgets.BoxElement;

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
      content: '{bold}Solve Puzzle{/bold}',
      tags: true
    });
    container.append(title);

    // Form
    this.form = new Form(this.outputManager, this.themeManager, {
      onSubmit: (data) => this.handleSubmit(data as SolveFormData)
    });

    const formElement = this.form.render();
    formElement.top = 2;
    formElement.width = '100%';
    formElement.height = 15;
    container.append(formElement);

    // Puzzle file field
    const puzzleField = new TextField(this.outputManager, this.themeManager, {
      label: 'Puzzle File',
      top: 0,
      left: 0,
      width: '80%',
      height: 3,
      value: 'puzzles/easy-01.json'
    });
    this.form.addField('puzzleFile', puzzleField);

    // Session ID field
    const sessionField = new TextField(this.outputManager, this.themeManager, {
      label: 'Session ID',
      top: 3,
      left: 0,
      width: '80%',
      height: 3,
      value: 'tui-session'
    });
    this.form.addField('sessionId', sessionField);

    // Max iterations field
    const iterationsField = new TextField(this.outputManager, this.themeManager, {
      label: 'Max Iterations',
      top: 6,
      left: 0,
      width: '40%',
      height: 3,
      value: '10'
    });
    this.form.addField('maxIterations', iterationsField);

    // Submit button
    const submitBtn = new Button(this.outputManager, this.themeManager, {
      text: '  Start Solve  ',
      top: 10,
      left: 0,
      onClick: () => this.form?.submit()
    });
    this.form.addField('submitButton', submitBtn);

    // Status text
    this.statusText = blessed.box({
      top: 18,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content: 'Fill in the form and press Ctrl+Enter or click Start Solve'
    });
    container.append(this.statusText);

    // Progress box
    this.progressBox = blessed.box({
      top: 20,
      left: 0,
      width: '100%',
      height: 5,
      border: { type: 'line' },
      label: ' Progress ',
      tags: true,
      hidden: true
    });
    container.append(this.progressBox);

    // Result box
    this.resultBox = blessed.box({
      top: 26,
      left: 0,
      width: '100%',
      height: 10,
      border: { type: 'line' },
      label: ' Result ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      hidden: true
    });
    container.append(this.resultBox);

    // Focus first field
    setTimeout(() => this.form?.focusFirst(), 100);

    this.emit('render', { screen: 'solve' });

    return container;
  }

  private async handleSubmit(formData: SolveFormData): Promise<void> {
    this.statusText?.setContent('Starting solve...');
    this.progressBox?.show();
    this.resultBox?.hide();
    this.refresh();

    const result = await this.cliExecutor.execute(
      'solve',
      [formData.puzzleFile || 'puzzles/easy-01.json'],
      {
        sessionId: formData.sessionId || 'tui-session',
        maxIterations: parseInt(formData.maxIterations?.toString() || '10', 10)
      },
      {
        onProgress: (event) => {
          const progressText = `${event.message || ''} (${event.percentage || 0}%)`;
          this.progressBox?.setContent(`\n  ${progressText}`);
          this.refresh();
        }
      }
    );

    // Show result
    this.progressBox?.hide();
    this.resultBox?.show();

    if (result.success) {
      this.statusText?.setContent('[OK] Solve completed successfully!');
      this.resultBox?.setContent(
        `\n{bold}Success!{/bold}\n\n` +
        `Result:\n${JSON.stringify(result.data, null, 2)}\n\n` +
        `Execution time: ${result.executionTime}ms`
      );
    } else {
      this.statusText?.setContent('[ERROR] Solve failed');
      this.resultBox?.setContent(
        `\n{bold}Error:{/bold}\n\n` +
        `${result.error?.message || 'Unknown error'}`
      );
    }

    this.refresh();
  }
}
