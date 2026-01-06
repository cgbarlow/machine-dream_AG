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
{bold}{center}🎮 Interactive Demonstrations{/center}{/bold}

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

{bold}Available Demos:{/bold}

{bold}1. GRASP Loop Visualization{/bold}
   Watch the Generate-Reflect-Assess-Select-Persist loop in action
   • Live state visualization
   • Step-by-step execution
   • Real-time metrics

{bold}2. Memory System Tour{/bold}
   Explore AgentDB vector database capabilities
   • Vector similarity search
   • Session persistence
   • Memory consolidation

{bold}3. Neural Pattern Learning{/bold}
   See how the system learns from experience
   • Pattern recognition
   • Strategy optimization
   • Performance improvement

{bold}4. Dream Cycle Walkthrough{/bold}
   Experience the 5-phase dream process
   • Capture recent experiences
   • Triage by importance
   • Compress similar patterns
   • Abstract key concepts
   • Integrate into long-term memory

{cyan-fg}───────────────────────────────────────────────────────────────────{/cyan-fg}

{bold}How to Run Demos:{/bold}

From CLI:
  $ machine-dream demo grasp-loop
  $ machine-dream demo memory-tour
  $ machine-dream demo neural-learning
  $ machine-dream demo dream-cycle

{cyan-fg}═══════════════════════════════════════════════════════════════════{/cyan-fg}

{bold}Interactive Features:{/bold}
  • Pause/Resume execution
  • Step through processes
  • Inspect internal state
  • Export session data

Press {bold}Ctrl+R{/bold} to refresh this screen
`;
  }
}
