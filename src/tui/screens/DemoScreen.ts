/**
 * Demo Screen
 *
 * Interactive demonstrations of system capabilities.
 */

import blessed, { Widgets } from 'blessed';
import { Component } from '../components/base/Component';
import { OutputManager } from '../services/OutputManager';
import { ThemeManager } from '../services/ThemeManager';

export class DemoScreen extends Component {
  constructor(outputManager: OutputManager, _themeManager: ThemeManager) {
    super(outputManager, {});
  }

  render(): Widgets.BoxElement {
    const box = blessed.box({
      width: '100%',
      height: '100%',
      tags: true,
      content: this.getDemoContent(),
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

    this.emit('render', { screen: 'demo' });

    return box;
  }

  private getDemoContent(): string {
    return `
{bold}{center} Interactive Demonstrations{/center}{/bold}

═══════════════════════════════════════════════════════════════════

Available Demos:

1. GRASP Loop Visualization
   Watch the Generate-Reflect-Assess-Select-Persist loop in action
   - Live state visualization
   - Step-by-step execution
   - Real-time metrics

2. Memory System Tour
   Explore AgentDB vector database capabilities
   - Vector similarity search
   - Session persistence
   - Memory consolidation

3. Neural Pattern Learning
   See how the system learns from experience
   - Pattern recognition
   - Strategy optimization
   - Performance improvement

4. Dream Cycle Walkthrough
   Experience the 5-phase dream process
   - Capture recent experiences
   - Triage by importance
   - Compress similar patterns
   - Abstract key concepts
   - Integrate into long-term memory

───────────────────────────────────────────────────────────────────

How to Run Demos:

From CLI:
  $ machine-dream demo grasp-loop
  $ machine-dream demo memory-tour
  $ machine-dream demo neural-learning
  $ machine-dream demo dream-cycle

═══════════════════════════════════════════════════════════════════

Interactive Features:
  - Pause/Resume execution
  - Step through processes
  - Inspect internal state
  - Export session data

Press Ctrl+R to refresh this screen
`;
  }
}
