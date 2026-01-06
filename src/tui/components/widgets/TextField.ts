/**
 * TextField Component
 *
 * Text input field for forms.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';
import { TextFieldProps } from '../../types';

export class TextField extends Component {
  private themeManager: ThemeManager;
  private textbox?: Widgets.TextboxElement;
  private onChange?: (value: string) => void;
  private onSubmitCallback?: (value: string) => void;

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager,
    props: TextFieldProps
  ) {
    super(outputManager, props);
    this.themeManager = themeManager;
    this.onChange = props.onChange;
    this.onSubmitCallback = props.onSubmit;
  }

  render(): Widgets.TextboxElement {
    const theme = this.themeManager.getTheme();
    const props = this.props as TextFieldProps;

    this.textbox = blessed.textbox({
      ...this.props,
      label: props.label ? ` ${props.label} ` : undefined,
      value: props.value || '',
      secret: props.password || false,
      censor: props.password || false,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        bg: 'black',
        border: {
          fg: theme.ui.border
        },
        focus: {
          border: {
            fg: theme.ui.focusBorder
          }
        }
      }
    });

    // Handle value changes
    this.textbox.on('submit', (value: string) => {
      this.handleSubmit(value);
    });

    this.textbox.on('cancel', () => {
      this.emit('input', { action: 'cancel' });
    });

    return this.textbox;
  }

  private handleSubmit(value: string): void {
    this.emit('input', {
      action: 'submit',
      value
    });

    if (this.onChange) {
      this.onChange(value);
    }

    if (this.onSubmitCallback) {
      this.onSubmitCallback(value);
    }
  }

  getValue(): string {
    if (this.textbox) {
      return this.textbox.getValue();
    }
    return '';
  }

  setValue(value: string): void {
    if (this.textbox) {
      this.textbox.setValue(value);
      this.refresh();
    }
  }

  readInput(callback?: (err: any, value?: string) => void): void {
    if (this.textbox) {
      this.textbox.readInput((err, value) => {
        if (!err && value !== undefined) {
          this.handleSubmit(value);
        }
        if (callback) {
          callback(err, value);
        }
      });
    }
  }
}
