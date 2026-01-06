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

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

{bold}System Status{/bold}
  Memory System:  ✓ AgentDB (Ready)
  Sessions:       0 total
  Database:       ✓ Healthy
  Uptime:         Just started

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

{bold}Quick Start{/bold}
  1. Press {bold}S{/bold} to solve a puzzle
  2. Press {bold}M{/bold} to browse memory
  3. Press {bold}D{/bold} to run dream cycle
  4. Press {bold}B{/bold} to run benchmarks

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

{bold}Keyboard Shortcuts{/bold}
  {bold}F1{/bold}          - Help
  {bold}Ctrl+C{/bold}      - Exit
  {bold}Ctrl+R{/bold}      - Refresh
  {bold}Tab{/bold}         - Next field
  {bold}Enter{/bold}       - Select/Submit

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

Navigate using the menu on the left or press keyboard shortcuts above.
`;
  }
}
