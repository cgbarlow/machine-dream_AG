/**
 * Export Screen
 *
 * Export data and reports.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';

export class ExportScreen extends Component {
  constructor(outputManager: OutputManager, _themeManager: ThemeManager) {
    super(outputManager, {});
  }

  render(): Widgets.BoxElement {
    const box = blessed.box({
      width: '100%',
      height: '100%',
      tags: true,
      content: this.getExportContent(),
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

    this.emit('render', { screen: 'export' });

    return box;
  }

  private getExportContent(): string {
    return `
{bold}{center}📤 Data Export{/center}{/bold}

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

{bold}Available Export Options:{/bold}

{bold}1. Session Data{/bold}
   Export complete session history
   • Formats: JSON, CSV, Markdown
   • Includes: States, actions, metrics
   • Command: machine-dream export session <id>

{bold}2. Memory Database{/bold}
   Backup memory system data
   • Full database dump
   • Incremental backups
   • Vector embeddings included
   • Command: machine-dream export memory

{bold}3. Performance Reports{/bold}
   Generate performance analytics
   • Benchmark results
   • Resource utilization
   • Trend analysis
   • Command: machine-dream export metrics

{bold}4. Dream Summaries{/bold}
   Export dream cycle results
   • Pattern discoveries
   • Abstracted knowledge
   • Learning insights
   • Command: machine-dream export dreams

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

{bold}Export Formats:{/bold}

  JSON        Structured data, machine-readable
  CSV         Spreadsheet import, analytics
  Markdown    Human-readable reports
  SQLite      Database backup format

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

{bold}Quick Export Commands:{/bold}

  # Export last session
  $ machine-dream export session latest

  # Export all memory
  $ machine-dream export memory --format json

  # Export metrics (last 7 days)
  $ machine-dream export metrics --days 7

  # Export dream results
  $ machine-dream export dreams --format md

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

Default export location: ~/.machine-dream/exports/
`;
  }
}
