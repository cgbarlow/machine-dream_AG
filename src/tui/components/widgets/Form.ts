/**
 * Form Component
 *
 * Container for form fields with validation and submission.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';

export class Form extends Component {
  private form?: Widgets.FormElement<any>;
  private fields: Map<string, Component> = new Map();
  private onSubmit?: (data: Record<string, any>) => void;

  constructor(
    outputManager: OutputManager,
    _themeManager: ThemeManager,
    options: {
      onSubmit?: (data: Record<string, any>) => void;
    } = {}
  ) {
    super(outputManager, {});
    this.onSubmit = options.onSubmit;
  }

  render(): Widgets.FormElement<any> {
    this.form = blessed.form({
      keys: true,
      mouse: true,
      vi: true
    });

    // Handle form submission (Ctrl+Enter)
    this.form.key(['C-enter'], () => {
      this.submit();
    });

    return this.form;
  }

  addField(name: string, component: Component): void {
    this.fields.set(name, component);

    if (this.form) {
      component.mount(this.form);
    }
  }

  getData(): Record<string, any> {
    const data: Record<string, any> = {};

    this.fields.forEach((component, name) => {
      const element = component.getElement();
      if (element && 'getValue' in element) {
        data[name] = (element as any).getValue();
      } else if (element && 'value' in element) {
        data[name] = (element as any).value;
      }
    });

    return data;
  }

  setData(data: Record<string, any>): void {
    Object.entries(data).forEach(([name, value]) => {
      const component = this.fields.get(name);
      if (component) {
        const element = component.getElement();
        if (element && 'setValue' in element) {
          (element as any).setValue(value);
        }
      }
    });
  }

  submit(): void {
    const data = this.getData();

    this.emit('command', {
      action: 'form-submit',
      data
    });

    if (this.onSubmit) {
      this.onSubmit(data);
    }
  }

  reset(): void {
    this.fields.forEach((component) => {
      const element = component.getElement();
      if (element && 'setValue' in element) {
        (element as any).setValue('');
      }
    });

    this.emit('state', { action: 'form-reset' });
  }

  focusFirst(): void {
    const firstField = Array.from(this.fields.values())[0];
    if (firstField) {
      firstField.focus();
    }
  }
}
