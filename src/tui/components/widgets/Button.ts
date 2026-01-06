/**
 * Button Component
 *
 * Clickable button for forms and actions.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';
import { ButtonProps } from '../../types';

export class Button extends Component {
  private themeManager: ThemeManager;
  private button?: Widgets.ButtonElement;
  private onClick?: () => void;

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager,
    props: ButtonProps
  ) {
    super(outputManager, props);
    this.themeManager = themeManager;
    this.onClick = props.onClick;
  }

  render(): Widgets.ButtonElement {
    const theme = this.themeManager.getTheme();
    const props = this.props as ButtonProps;

    this.button = blessed.button({
      ...this.props,
      content: props.text || 'Button',
      keys: true,
      mouse: true,
      shrink: true,
      padding: {
        left: 2,
        right: 2
      },
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
          bg: theme.ui.selectedBg,
          fg: theme.ui.selectedFg,
          border: {
            fg: theme.ui.focusBorder
          }
        },
        hover: {
          bg: theme.ui.selectedBg
        }
      }
    });

    // Handle click
    this.button.on('press', () => {
      this.handlePress();
    });

    // Handle keyboard activation
    this.button.key(['enter', 'space'], () => {
      this.handlePress();
    });

    return this.button;
  }

  private handlePress(): void {
    this.emit('input', {
      action: 'button-press',
      button: (this.props as ButtonProps).text
    });

    if (this.onClick) {
      this.onClick();
    }
  }

  setText(text: string): void {
    if (this.button) {
      this.button.setContent(text);
      this.refresh();
    }
  }

  enable(): void {
    if (this.button) {
      (this.button as any).enable();
      this.refresh();
    }
  }

  disable(): void {
    if (this.button) {
      (this.button as any).disable();
      this.refresh();
    }
  }
}
