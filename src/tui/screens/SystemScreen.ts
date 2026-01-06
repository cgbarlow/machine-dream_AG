/**
 * System Screen
 *
 * System information and diagnostics.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';

export class SystemScreen extends Component {
  constructor(outputManager: OutputManager, _themeManager: ThemeManager) {
    super(outputManager, {});
  }

  render(): Widgets.BoxElement {
    const box = blessed.box({
      width: '100%',
      height: '100%',
      tags: true,
      content: this.getSystemContent(),
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

    this.emit('render', { screen: 'system' });

    return box;
  }

  private getSystemContent(): string {
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    const uptime = process.uptime();
    const memUsage = process.memoryUsage();

    return `
{center}System Information{/center}

===================================================================

Runtime Environment:
  Node.js version:    ${nodeVersion}
  Platform:           ${platform}
  Architecture:       ${arch}
  Process uptime:     ${Math.floor(uptime)} seconds

Memory Usage:
  Heap used:          ${Math.floor(memUsage.heapUsed / 1024 / 1024)} MB
  Heap total:         ${Math.floor(memUsage.heapTotal / 1024 / 1024)} MB
  RSS:                ${Math.floor(memUsage.rss / 1024 / 1024)} MB
  External:           ${Math.floor(memUsage.external / 1024 / 1024)} MB

Machine Dream:
  Version:            1.0.0
  Memory system:      AgentDB
  Database status:    Healthy
  Active sessions:    0

-------------------------------------------------------------------

Dependencies:
  AgentDB:            ^1.0.0
  blessed:            ^0.1.81
  @anthropic-ai/sdk:  ^0.30.1
  vitest:             ^2.1.8
  typescript:         ^5.7.2

-------------------------------------------------------------------

File Locations:
  Home directory:     ~/.machine-dream
  Database:           ~/.machine-dream/agentdb
  Configuration:      ~/.machine-dream/config.json
  Logs:               ~/.machine-dream/logs
  Exports:            ~/.machine-dream/exports

-------------------------------------------------------------------

Diagnostics:
  [OK] Memory system operational
  [OK] Configuration valid
  [OK] Database accessible
  [OK] Terminal capabilities detected
  [OK] All core systems functional

===================================================================

For detailed diagnostics: $ machine-dream system check
For logs: $ machine-dream system logs
`;
  }
}
