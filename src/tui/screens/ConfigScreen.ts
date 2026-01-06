/**
 * Config Screen
 *
 * System configuration management.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';

export class ConfigScreen extends Component {
  constructor(outputManager: OutputManager, _themeManager: ThemeManager) {
    super(outputManager, {});
  }

  render(): Widgets.BoxElement {
    const box = blessed.box({
      width: '100%',
      height: '100%',
      tags: true,
      content: this.getConfigContent(),
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

    this.emit('render', { screen: 'config' });

    return box;
  }

  private getConfigContent(): string {
    return `
{bold}{center}⚙️  System Configuration{/center}{/bold}

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

Current Configuration:

Memory System:
  Database:           AgentDB
  Storage path:       ~/.machine-dream/agentdb
  Cache size:         256 MB
  Vector dimensions:  384
  Index type:         HNSW

Neural Models:
  Embedding model:    all-MiniLM-L6-v2
  LLM provider:       Local
  Max context:        8192 tokens
  Temperature:        0.7

GRASP Parameters:
  Max iterations:     50
  Timeout:           30000 ms
  Reflection depth:   3
  Selection strategy: best-first

Dream Cycle:
  Auto-run:          Enabled
  Interval:          24 hours
  Compression ratio:  0.3
  Min importance:     0.5

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

Environment Variables:

  MACHINE_DREAM_HOME      ~/.machine-dream
  AGENTDB_PATH            ~/.machine-dream/agentdb
  LOG_LEVEL               info
  MEMORY_SYSTEM           agentdb
  ENABLE_TELEMETRY        false

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

Configuration Files:

  Config:    ~/.machine-dream/config.json
  Secrets:   ~/.machine-dream/secrets.env
  Logs:      ~/.machine-dream/logs/

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

To modify configuration, edit files above or use:
  $ machine-dream config set <key> <value>
  $ machine-dream config get <key>
  $ machine-dream config list
`;
  }
}
