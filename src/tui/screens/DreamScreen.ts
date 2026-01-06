/**
 * Dream Screen
 *
 * Run dream cycles with phase tracking.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';
import { CLIExecutor } from '../services/CLIExecutor';
import { Form } from '../components/widgets/Form';
import { TextField } from '../components/widgets/TextField';
import { Button } from '../components/widgets/Button';
import { DreamFormData } from '../types';

export class DreamScreen extends Component {
  private themeManager: ThemeManager;
  private cliExecutor: CLIExecutor;
  private form?: Form;
  private progressBox?: Widgets.BoxElement;
  private phaseBox?: Widgets.BoxElement;
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
      content: '{bold}{cyan-fg} Dream Cycle{/cyan-fg}{/bold}',
      tags: true
    });
    container.append(title);

    // Form
    this.form = new Form(this.outputManager, this.themeManager, {
      onSubmit: (data) => this.handleSubmit(data as DreamFormData)
    });

    const formElement = this.form.render();
    formElement.top = 2;
    formElement.width = '100%';
    formElement.height = 10;
    container.append(formElement);

    // Session ID field
    const sessionField = new TextField(this.outputManager, this.themeManager, {
      label: 'Session ID',
      top: 0,
      left: 0,
      width: '80%',
      height: 3,
      value: 'dream-session'
    });
    this.form.addField('sessionId', sessionField);

    // Cycle type field
    const cycleField = new TextField(this.outputManager, this.themeManager, {
      label: 'Cycle Type',
      top: 3,
      left: 0,
      width: '50%',
      height: 3,
      value: 'full'
    });
    this.form.addField('cycleType', cycleField);

    // Start button
    const startBtn = new Button(this.outputManager, this.themeManager, {
      text: '  Start Dream Cycle  ',
      top: 7,
      left: 0,
      onClick: () => this.form?.submit()
    });
    this.form.addField('startButton', startBtn);

    // Status text
    this.statusText = blessed.box({
      top: 13,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content: 'Configure and start a dream cycle'
    });
    container.append(this.statusText);

    // Progress box
    this.progressBox = blessed.box({
      top: 15,
      left: 0,
      width: '100%',
      height: 3,
      border: { type: 'line' },
      label: ' Overall Progress ',
      tags: true,
      hidden: true
    });
    container.append(this.progressBox);

    // Phase box
    this.phaseBox = blessed.box({
      top: 19,
      left: 0,
      width: '100%',
      height: 8,
      border: { type: 'line' },
      label: ' Dream Phases ',
      tags: true,
      hidden: true
    });
    container.append(this.phaseBox);

    // Result box
    this.resultBox = blessed.box({
      top: 28,
      left: 0,
      width: '100%',
      height: 8,
      border: { type: 'line' },
      label: ' Results ',
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

    this.emit('render', { screen: 'dream' });

    return container;
  }

  private async handleSubmit(formData: DreamFormData): Promise<void> {
    this.statusText?.setContent('{yellow-fg}Starting dream cycle...{/yellow-fg}');
    this.progressBox?.show();
    this.phaseBox?.show();
    this.resultBox?.hide();
    this.refresh();

    const result = await this.cliExecutor.execute(
      'dream',
      [],
      {
        sessionId: formData.sessionId || 'dream-session',
        cycleType: formData.cycleType || 'full'
      },
      {
        onProgress: (event) => {
          const progressText = `${event.message || ''} (${event.percentage || 0}%)`;
          this.progressBox?.setContent(`\n  ${progressText}`);

          // Update phase information
          if (event.data && typeof event.data === 'object' && 'phase' in event.data) {
            const phaseData = event.data as { phase: string; phaseIndex: number };
            const phases = ['Capture', 'Triage', 'Compress', 'Abstract', 'Integrate'];
            const phaseStatus = phases.map((p, i) => {
              const status = i < phaseData.phaseIndex ? '[OK]' : i === phaseData.phaseIndex ? '⏵' : '○';
              return `  ${status} ${p}`;
            }).join('\n');
            this.phaseBox?.setContent(`\n${phaseStatus}`);
          }

          this.refresh();
        }
      }
    );

    // Show result
    this.progressBox?.hide();
    this.phaseBox?.hide();
    this.resultBox?.show();

    if (result.success) {
      this.statusText?.setContent('{green-fg}[OK] Dream cycle completed successfully!{/green-fg}');
      this.resultBox?.setContent(
        `\nDream Cycle Complete\n\n` +
        `Phases completed: ${(result.data as any)?.phases || 5}\n` +
        `Execution time: ${result.executionTime}ms\n\n` +
        `Results:\n${JSON.stringify(result.data, null, 2)}`
      );
    } else {
      this.statusText?.setContent('{red-fg}[X] Dream cycle failed{/red-fg}');
      this.resultBox?.setContent(
        `\nError:\n\n` +
        `${result.error?.message || 'Unknown error'}`
      );
    }

    this.refresh();
  }
}
