/**
 * Content Area Component
 *
 * Main content display area where screens are rendered.
 */

import blessed, { Widgets } from 'neo-blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';

export class ContentArea extends Component {
  private themeManager: ThemeManager;
  private currentContent?: Component;

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager
  ) {
    super(outputManager, {
      width: '80%-2',
      height: '100%-3', // Account for header and status bar
      top: 2,
      left: '20%'
    });
    this.themeManager = themeManager;
  }

  render(): Widgets.BoxElement {
    const theme = this.themeManager.getTheme();

    const element = blessed.box({
      top: this.props.top,
      left: this.props.left,
      width: this.props.width,
      height: this.props.height,
      label: ' {bold}Content{/bold} ',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: theme.ui.border
        }
      },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'blue'
        }
      }
    });

    return element;
  }

  setContentComponent(content: Component): void {
    // Unmount previous content
    if (this.currentContent) {
      this.currentContent.unmount();
    }

    // Mount new content
    this.currentContent = content;
    content.mount(this.element);

    this.emit('render', {
      action: 'content-changed',
      component: content.constructor.name
    });

    this.refresh();
  }

  clearContent(): void {
    if (this.currentContent) {
      this.currentContent.unmount();
      this.currentContent = undefined;
    }

    if (this.element) {
      (this.element as Widgets.BoxElement).setContent('');
      this.refresh();
    }
  }

  getCurrentContent(): Component | undefined {
    return this.currentContent;
  }
}
