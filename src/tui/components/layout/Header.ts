/**
 * Header Component
 *
 * Displays title bar at the top of the screen.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';

export class Header extends Component {
  private themeManager: ThemeManager;
  private title: string;
  private subtitle?: string;

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager,
    options: {
      title: string;
      subtitle?: string;
    }
  ) {
    super(outputManager, {
      height: 2,
      top: 0,
      left: 0,
      width: '100%'
    });
    this.themeManager = themeManager;
    this.title = options.title;
    this.subtitle = options.subtitle;
  }

  render(): Widgets.BoxElement {
    const theme = this.themeManager.getTheme();

    const element = blessed.box({
      top: this.props.top,
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
    const content = this.subtitle
      ? `{bold}${this.title}{/bold} - ${this.subtitle}`
      : `{bold}${this.title}{/bold}`;

    element.setContent(`  ${content}`);
  }

  setTitle(title: string, subtitle?: string): void {
    this.title = title;
    this.subtitle = subtitle;

    if (this.element) {
      this.updateContent(this.element as Widgets.BoxElement);
      this.refresh();
    }

    this.emit('state', { title, subtitle });
  }
}
