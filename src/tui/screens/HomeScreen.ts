/**
 * Home Screen
 *
 * Dashboard showing system status and recent activity.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';

export class HomeScreen extends Component {
  constructor(outputManager: OutputManager, _themeManager: ThemeManager) {
    super(outputManager, {});
  }

  render(): Widgets.BoxElement {
    const box = blessed.box({
      width: '100%',
      height: '100%',
      tags: true,
      content: this.getHomeContent(),
      padding: {
        left: 2,
        right: 2,
        top: 1,
        bottom: 1
      },
      style: {
        fg: 'white',
        bg: 'black'
      },
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true
    });

    this.emit('render', { screen: 'home' });

    return box;
  }

  private getHomeContent(): string {
    return `
{bold}{center}Welcome to Machine Dream TUI{/center}{/bold}

===================================================================

System Status:
  Memory System:  AgentDB (Ready)
  Sessions:       0 total
  Database:       Healthy
  Uptime:         Just started

-------------------------------------------------------------------

Quick Start:
  1. Press [S] to solve a puzzle
  2. Press [M] to browse memory
  3. Press [D] to run dream cycle
  4. Press [B] to run benchmarks

-------------------------------------------------------------------

Keyboard Shortcuts:
  F1          - Help
  Ctrl+C      - Exit
  Ctrl+R      - Refresh
  Tab         - Next field
  Enter       - Select/Submit

===================================================================

Navigate using the menu on the left or press keyboard shortcuts above.
`;
  }
}
