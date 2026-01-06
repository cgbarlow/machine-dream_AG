/**
 * Status Bar Component
 *
 * Bottom status bar showing session info, help hints, and system status.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';

export class StatusBar extends Component {
  private themeManager: ThemeManager;
  private sessionId: string;
  private statusMessage = '';
  private helpText = '[F1] Help';

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager,
    options: {
      sessionId: string;
    }
  ) {
    super(outputManager, {
      height: 1,
      bottom: 0,
      left: 0,
      width: '100%'
    });
    this.themeManager = themeManager;
    this.sessionId = options.sessionId;
  }

  render(): Widgets.BoxElement {
    const theme = this.themeManager.getTheme();

    const element = blessed.box({
      bottom: this.props.bottom,
      left: this.props.left,
      width: this.props.width,
      height: this.props.height,
      tags: true,
      style: {
        fg: theme.ui.selectedFg,
        bg: theme.ui.selectedBg
      }
    });

    this.updateContent(element);

    return element;
  }

  private updateContent(element: Widgets.BoxElement): void {
    const sessionText = `Session: ${this.sessionId}`;
    const rightText = this.helpText;

    // Calculate padding to right-align help text
    // In headless/CI environments, width may be undefined - use fallback
    let totalWidth = 80; // Default fallback

    if (element && element.screen) {
      totalWidth = (element.screen.width as number) || 80;
    } else if (element && typeof element.width === 'number') {
      totalWidth = element.width;
    } else if (typeof process.stdout.columns === 'number') {
      totalWidth = process.stdout.columns;
    }

    const leftPart = `  ${sessionText}  ${this.statusMessage}`;
    const padding = totalWidth - leftPart.length - rightText.length - 2;

    const content = leftPart + ' '.repeat(Math.max(0, padding)) + rightText;
    element.setContent(content);
  }

  setStatus(message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info'): void {
    const theme = this.themeManager.getTheme();

    let colorTag = '';
    switch (type) {
      case 'error':
        colorTag = `{${theme.colors.error}-fg}`;
        break;
      case 'warning':
        colorTag = `{${theme.colors.warning}-fg}`;
        break;
      case 'success':
        colorTag = `{${theme.colors.success}-fg}`;
        break;
      default:
        colorTag = '';
    }

    this.statusMessage = colorTag ? `${colorTag}${message}{/}` : message;

    if (this.element) {
      this.updateContent(this.element as Widgets.BoxElement);
      this.refresh();
    }

    this.emit('state', { status: message, type });
  }

  clearStatus(): void {
    this.setStatus('');
  }

  setHelpText(text: string): void {
    this.helpText = text;

    if (this.element) {
      this.updateContent(this.element as Widgets.BoxElement);
      this.refresh();
    }
  }
}
