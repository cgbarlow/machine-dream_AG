/**
 * Memory Screen
 *
 * Browse and manage memory entries.
 */

import blessed, { Widgets } from 'neo-blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';
import { CLIExecutor } from '../services/CLIExecutor';
import { Form } from '../components/widgets/Form';
import { TextField } from '../components/widgets/TextField';
import { Button } from '../components/widgets/Button';
import { MemoryStoreFormData } from '../types';

export class MemoryScreen extends Component {
  private themeManager: ThemeManager;
  private cliExecutor: CLIExecutor;
  private form?: Form;
  private listBox?: Widgets.BoxElement;
  private detailBox?: Widgets.BoxElement;
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
      content: '{bold}Memory Browser{/bold}',
      tags: true
    });
    container.append(title);

    // Store form
    this.form = new Form(this.outputManager, this.themeManager, {
      onSubmit: (data) => this.handleStore(data as MemoryStoreFormData)
    });

    const formElement = this.form.render();
    formElement.top = 2;
    formElement.width = '100%';
    formElement.height = 12;
    container.append(formElement);

    // Key field
    const keyField = new TextField(this.outputManager, this.themeManager, {
      label: 'Key',
      top: 0,
      left: 0,
      width: '50%',
      height: 3,
      value: 'my-key'
    });
    this.form.addField('key', keyField);

    // Value field
    const valueField = new TextField(this.outputManager, this.themeManager, {
      label: 'Value',
      top: 3,
      left: 0,
      width: '100%',
      height: 3,
      value: 'my-value'
    });
    this.form.addField('value', valueField);

    // Store button
    const storeBtn = new Button(this.outputManager, this.themeManager, {
      text: '  Store Value  ',
      top: 7,
      left: 0,
      onClick: () => this.form?.submit()
    });
    this.form.addField('storeButton', storeBtn);

    // List button
    const listBtn = new Button(this.outputManager, this.themeManager, {
      text: '  List All  ',
      top: 7,
      left: 20,
      onClick: () => this.handleList()
    });
    this.form.addField('listButton', listBtn);

    // Status text
    this.statusText = blessed.box({
      top: 15,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content: 'Store a value or list all memory entries'
    });
    container.append(this.statusText);

    // List box
    this.listBox = blessed.box({
      top: 17,
      left: 0,
      width: '50%',
      height: 15,
      border: { type: 'line' },
      label: ' Keys ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true
    });
    container.append(this.listBox);

    // Detail box
    this.detailBox = blessed.box({
      top: 17,
      left: '50%',
      width: '50%',
      height: 15,
      border: { type: 'line' },
      label: ' Value ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true
    });
    container.append(this.detailBox);

    // Focus first field
    setTimeout(() => this.form?.focusFirst(), 100);

    this.emit('render', { screen: 'memory' });

    return container;
  }

  private async handleStore(formData: MemoryStoreFormData): Promise<void> {
    this.statusText?.setContent('Storing value...');
    this.refresh();

    const result = await this.cliExecutor.execute(
      'memory',
      ['store', formData.key || 'default-key'],
      {
        value: formData.value || ''
      }
    );

    if (result.success) {
      this.statusText?.setContent('[OK] Value stored successfully!');
      await this.handleList();
    } else {
      this.statusText?.setContent('[ERROR] Failed to store value');
    }

    this.refresh();
  }

  private async handleList(): Promise<void> {
    this.statusText?.setContent('Loading memory entries...');
    this.refresh();

    const result = await this.cliExecutor.execute(
      'memory',
      ['list'],
      {}
    );

    if (result.success) {
      this.statusText?.setContent('[OK] Loaded memory entries');

      // Display keys (simulated data for now)
      const keys = ['session-state', 'puzzle-cache', 'dream-results', 'my-key'];
      this.listBox?.setContent('\n  ' + keys.join('\n  '));

      this.detailBox?.setContent('\nSelect a key to view its value');
    } else {
      this.statusText?.setContent('[ERROR] Failed to load entries');
    }

    this.refresh();
  }
}
