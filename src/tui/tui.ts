/**
 * Machine Dream TUI - Main Entry Point
 *
 * Terminal User Interface implementation using blessed framework.
 * This provides an interactive menu-driven interface to all Machine Dream functionality.
 */

import blessed from 'blessed';
import { TUIOptions, TUISessionState, TUICommandMapping, TUITheme } from './types';
import { getTheme } from './themes';
import { logger } from '../cli/logger';
import { executeCLICommand } from './cli-integration';
import { detectTerminalEnvironment, validateTerminalEnvironment, applyTerminalFixes, getTerminalConfiguration } from './environment';

export class MachineDreamTUI {
    private screen: any;
    private options: TUIOptions;
    private sessionState: TUISessionState;
    private commandMapping: TUICommandMapping;
    private currentTheme: TUITheme;
    private terminalInfo: any;

    constructor(options: TUIOptions = {}) {
        // Apply terminal fixes before anything else
        applyTerminalFixes();

        // Validate terminal environment
        const envValidation = validateTerminalEnvironment();
        if (!envValidation.valid) {
            logger.warn('⚠️ Terminal environment issues detected:');
            envValidation.issues.forEach(issue => logger.warn(`  • ${issue}`));
            envValidation.warnings.forEach(warning => logger.info(`  • ${warning}`));
        }

        // Detect terminal capabilities
        const terminalInfo = detectTerminalEnvironment();
        this.terminalInfo = terminalInfo;

        this.options = {
            theme: 'dark',
            layout: {
                menuWidth: 20,
                showStatusBar: true,
                fontSize: 'normal',
                animations: !terminalInfo.isCI && !terminalInfo.isDocker
            },
            behavior: {
                confirmDestructive: true,
                autoRefresh: !terminalInfo.isCI,
                refreshInterval: 5000,
                mouseEnabled: terminalInfo.supportsMouse && !terminalInfo.isCI,
                soundEnabled: false
            },
            ...options
        };

        this.currentTheme = getTheme(this.options.theme);
        this.sessionState = {};

        // Initialize command mapping based on CLI spec
        this.commandMapping = this.buildCommandMapping();

        // Get terminal-specific configuration
        const screenConfig = getTerminalConfiguration(terminalInfo);

        // Create blessed screen with environment-aware settings
        try {
            this.screen = blessed.screen({
                ...screenConfig,
                title: 'Machine Dream TUI'
            });
            logger.info('✅ Terminal configured successfully');
        } catch (error: any) {
            logger.error(`❌ Failed to initialize screen: ${error.message}`);
            logger.info('🔧 Falling back to simple mode...');

            // Fallback to minimal configuration
            this.screen = blessed.screen({
                smartCSR: false,
                fullUnicode: false,
                dockBorders: false,
                warnings: false,
                terminal: 'vt100',
                title: 'Machine Dream TUI (Simple Mode)'
            });
        }

        // Set up error handling
        this.screen.on('error', (error: any) => {
            logger.error(`TUI Error: ${error.message}`);
        });

        // Set up quit handling
        this.screen.key(['C-c', 'q'], () => {
            this.exitTUI();
        });

        // Set up global key bindings
        this.setupGlobalKeyBindings();
    }

    public start(): void {
        logger.info('🎯 Starting Machine Dream TUI...');
        logger.info(`📋 Terminal: ${this.terminalInfo.term} (${this.terminalInfo.columns}x${this.terminalInfo.rows})`);
        logger.info(`🎨 Colors: ${this.terminalInfo.supportsColor ? '✅' : '❌'} | Unicode: ${this.terminalInfo.supportsUnicode ? '✅' : '❌'}`);
        logger.info(`🖱️ Mouse: ${this.terminalInfo.supportsMouse ? '✅' : '❌'} | TTY: ${this.terminalInfo.isTTY ? '✅' : '❌'}`);

        if (this.terminalInfo.isCI) {
            logger.warn('🔧 Running in CI mode - some interactive features disabled');
        }

        if (this.terminalInfo.isDocker) {
            logger.warn('🐳 Running in Docker container - terminal support may be limited');
        }

        // Create main layout
        this.createMainLayout();

        // Render the screen
        this.screen.render();

        logger.info('✅ TUI started successfully. Press Ctrl+C to exit.');
    }

    private buildCommandMapping(): TUICommandMapping {
        return {
            solve: {
                command: 'solve',
                description: 'Puzzle solving operations',
                icon: '🧩',
                shortcut: 'S',
                subcommands: {
                    'quick-solve': {
                        command: 'solve',
                        description: 'Quick solve with defaults',
                        icon: '⚡'
                    },
                    'advanced-solve': {
                        command: 'solve',
                        description: 'Advanced solve with options',
                        icon: '🎛️'
                    },
                    'batch-solve': {
                        command: 'solve',
                        description: 'Batch solve multiple puzzles',
                        icon: '📦'
                    },
                    'visualize': {
                        command: 'solve',
                        description: 'Solve with live visualization',
                        icon: '👁️'
                    }
                }
            },
            memory: {
                command: 'memory',
                description: 'Memory system operations',
                icon: '🧠',
                shortcut: 'M',
                subcommands: {
                    'store': {
                        command: 'memory store',
                        description: 'Store data in memory',
                        icon: '💾'
                    },
                    'retrieve': {
                        command: 'memory retrieve',
                        description: 'Retrieve data from memory',
                        icon: '📥'
                    },
                    'search': {
                        command: 'memory search',
                        description: 'Search memory patterns',
                        icon: '🔍'
                    },
                    'consolidate': {
                        command: 'memory consolidate',
                        description: 'Consolidate memory',
                        icon: '🗄️'
                    },
                    'optimize': {
                        command: 'memory optimize',
                        description: 'Optimize memory storage',
                        icon: '🔧'
                    },
                    'backup': {
                        command: 'memory backup',
                        description: 'Backup memory database',
                        icon: '💾'
                    },
                    'restore': {
                        command: 'memory restore',
                        description: 'Restore memory from backup',
                        icon: '🔄'
                    }
                }
            },
            dream: {
                command: 'dream',
                description: 'Dreaming/consolidation operations',
                icon: '💭',
                shortcut: 'D',
                subcommands: {
                    'run': {
                        command: 'dream run',
                        description: 'Run dream cycle',
                        icon: '🌙'
                    },
                    'schedule': {
                        command: 'dream schedule',
                        description: 'Configure dream schedule',
                        icon: '📅'
                    },
                    'status': {
                        command: 'dream status',
                        description: 'Check dream status',
                        icon: 'ℹ️'
                    }
                }
            },
            benchmark: {
                command: 'benchmark',
                description: 'Performance benchmarking',
                icon: '📊',
                shortcut: 'B',
                subcommands: {
                    'run': {
                        command: 'benchmark run',
                        description: 'Run benchmark suite',
                        icon: '🏃'
                    },
                    'report': {
                        command: 'benchmark report',
                        description: 'Generate benchmark report',
                        icon: '📈'
                    },
                    'compare': {
                        command: 'benchmark report',
                        description: 'Compare benchmark results',
                        icon: '⚖️'
                    }
                }
            },
            demo: {
                command: 'demo',
                description: 'Demo & presentation mode',
                icon: '🎬',
                shortcut: 'O',
                subcommands: {
                    'stakeholder': {
                        command: 'demo',
                        description: 'Stakeholder presentation',
                        icon: '👥'
                    },
                    'quick-solve': {
                        command: 'demo',
                        description: 'Quick solve demo',
                        icon: '⚡'
                    },
                    'transfer-learning': {
                        command: 'demo',
                        description: 'Transfer learning demo',
                        icon: '🔄'
                    },
                    'dreaming': {
                        command: 'demo',
                        description: 'Dreaming visualization',
                        icon: '🌙'
                    },
                    'baseline': {
                        command: 'demo',
                        description: 'Baseline comparison',
                        icon: '⚖️'
                    }
                }
            },
            settings: {
                command: 'config',
                description: 'Settings & Configuration',
                icon: '⚙️',
                shortcut: 'C',
                subcommands: {
                    'show': {
                        command: 'config show',
                        description: 'View configuration',
                        icon: '👁️'
                    },
                    'edit': {
                        command: 'config set',
                        description: 'Edit settings',
                        icon: '✏️'
                    },
                    'validate': {
                        command: 'config validate',
                        description: 'Validate configuration',
                        icon: '✅'
                    },
                    'export': {
                        command: 'config export',
                        description: 'Export configuration',
                        icon: '📤'
                    }
                }
            },
            export: {
                command: 'export',
                description: 'Data export utilities',
                icon: '📤',
                shortcut: 'E',
                subcommands: {
                    'metrics': {
                        command: 'export',
                        description: 'Export metrics',
                        icon: '📊'
                    },
                    'results': {
                        command: 'export',
                        description: 'Export results',
                        icon: '📈'
                    },
                    'memory': {
                        command: 'export',
                        description: 'Export memory',
                        icon: '🧠'
                    },
                    'all': {
                        command: 'export',
                        description: 'Export all data',
                        icon: '📦'
                    }
                }
            },
            system: {
                command: 'system',
                description: 'System utilities',
                icon: '🔧',
                shortcut: 'Y',
                subcommands: {
                    'dashboard': {
                        command: 'system status',
                        description: 'System dashboard',
                        icon: '📊'
                    },
                    'init': {
                        command: 'system init',
                        description: 'Initialize system',
                        icon: '🔧'
                    },
                    'status': {
                        command: 'system status',
                        description: 'System status',
                        icon: 'ℹ️'
                    },
                    'cleanup': {
                        command: 'system cleanup',
                        description: 'Clean temporary data',
                        icon: '🧹'
                    },
                    'health': {
                        command: 'system health',
                        description: 'Health check',
                        icon: '❤️'
                    },
                    'migrate': {
                        command: 'system migrate',
                        description: 'Database migration',
                        icon: '🔄'
                    }
                }
            },
            help: {
                command: 'help',
                description: 'Help system',
                icon: 'ℹ️',
                shortcut: 'H'
            },
            exit: {
                command: 'exit',
                description: 'Exit TUI',
                icon: '🚪',
                shortcut: 'Q'
            }
        };
    }

    private createMainLayout(): void {
        // Create header (plain text for VSCode terminal compatibility)
        const header = blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: 3,
            content: 'Machine Dream TUI - Cognitive Puzzle Solver',
            align: 'center',
            style: {
                fg: this.currentTheme.fg.bright,
                bg: this.currentTheme.bg.primary,
                bold: true
            },
            border: {
                type: 'line',
                fg: this.currentTheme.ui.border
            },
            padding: {
                left: 1,
                right: 1
            }
        });

        // Create main menu (left panel)
        const menuWidth = this.options.layout?.menuWidth || 22;
        const menu = blessed.list({
            top: 3,
            left: 0,
            width: menuWidth,
            height: '100%-4',
            style: {
                fg: this.currentTheme.fg.primary,
                bg: this.currentTheme.bg.secondary,
                selected: {
                    fg: this.currentTheme.fg.bright,
                    bg: this.currentTheme.bg.active
                },
                border: {
                    fg: this.currentTheme.ui.border
                }
            },
            border: {
                type: 'line',
                fg: this.currentTheme.ui.border
            },
            keys: true,
            vi: true,
            mouse: this.options.behavior?.mouseEnabled,
            tags: true,
            items: this.getMenuItems(),
            label: ' Menu '
        });

        // Create content area (right panel)
        const content = blessed.box({
            top: 3,
            left: menuWidth,
            width: `100%-${menuWidth}`,
            height: '100%-4',
            keys: true,
            vi: true,
            mouse: this.options.behavior?.mouseEnabled,
            tags: true,
            style: {
                fg: this.currentTheme.fg.primary,
                bg: this.currentTheme.bg.primary
            },
            border: {
                type: 'line',
                fg: this.currentTheme.ui.border
            },
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: '█',
                style: {
                    bg: this.currentTheme.ui.scrollbar
                }
            },
            label: ' Content '
        });

        // Create status bar
        const statusBar = blessed.box({
            bottom: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: '[Tab] Switch  [Ctrl+H] Help  [Ctrl+P] Commands  [Arrows] Navigate  [Q] Exit',
            style: {
                fg: this.currentTheme.fg.secondary,
                bg: this.currentTheme.bg.secondary
            },
            align: 'right'
        });

        // Set up menu navigation
        menu.on('select', (item: any, _index: number) => {
            this.handleMenuSelection(item.getText(), content);
        });

        // Set up global key bindings for menu navigation
        this.screen.key(['up', 'down'], () => {
            menu.focus();
        });

        // Add Tab navigation between menu and content
        this.screen.key(['tab'], () => {
            if ((this.screen.focused as any) === menu) {
                content.focus();
                menu.style.border.fg = this.currentTheme.ui.border;
                content.style.border.fg = this.currentTheme.ui.borderActive || 'yellow';
                // Use simple text for better compatibility
                content.setLabel(' Content (focused) ');
                menu.setLabel(' Menu ');
            } else {
                menu.focus();
                content.style.border.fg = this.currentTheme.ui.border;
                menu.style.border.fg = this.currentTheme.ui.borderActive || 'yellow';
                // Use simple text for better compatibility
                menu.setLabel(' Menu (focused) ');
                content.setLabel(' Content ');
            }
            this.screen.render();
        });

        // Add Shift+Tab for reverse navigation
        this.screen.key(['S-tab'], () => {
            if ((this.screen.focused as any) === content) {
                menu.focus();
                content.style.border.fg = this.currentTheme.ui.border;
                menu.style.border.fg = this.currentTheme.ui.borderActive || 'yellow';
                // Use simple text for better compatibility
                menu.setLabel(' Menu (focused) ');
                content.setLabel(' Content ');
            } else {
                content.focus();
                menu.style.border.fg = this.currentTheme.ui.border;
                content.style.border.fg = this.currentTheme.ui.borderActive || 'yellow';
                // Use simple text for better compatibility
                content.setLabel(' Content (focused) ');
                menu.setLabel(' Menu ');
            }
            this.screen.render();
        });

        // Set up menu shortcuts
        this.setupMenuShortcuts(menu);

        // Add elements to screen
        this.screen.append(header);
        this.screen.append(menu);
        this.screen.append(content);
        this.screen.append(statusBar);

        // Focus menu by default and set initial focus indicator
        menu.focus();
        menu.style.border.fg = this.currentTheme.ui.borderActive || 'yellow';
        // Use simple text for better compatibility
        menu.setLabel(' Menu (focused) ');

        // Set initial content
        content.setContent('Welcome to Machine Dream TUI!\n\nSelect a command from the menu or press a shortcut key.');

        // Update status bar with dynamic content
        this.updateStatusBar(statusBar);
    }

    private getMenuItems(): string[] {
        const items: string[] = [];

        for (const [key, cmd] of Object.entries(this.commandMapping)) {
            if (cmd.icon && cmd.shortcut) {
                // Use fixed width that accounts for variable emoji widths
                const displayName = key.padEnd(12, ' ');
                items.push(`${cmd.icon}  ${displayName} [${cmd.shortcut}]`);
            } else if (cmd.icon) {
                items.push(`${cmd.icon}  ${key}`);
            } else {
                items.push(key);
            }
        }

        return items;
    }

    private handleMenuSelection(selectedItem: string, content: any): void {
        // Extract the command name from the menu item
        // Format is: "🧩  solve        [S]" or "🧩  solve"
        // We want to extract just "solve"
        const trimmed = selectedItem.trim();
        const match = trimmed.match(/[^\s]+\s+([a-z\-]+)/i);
        const commandName = match ? match[1].toLowerCase().trim() : '';

        const command = (this.commandMapping as any)[commandName];

        if (!command) {
            content.setContent(`Unknown command: ${commandName}`);
            this.screen.render();
            return;
        }

        // Store current menu selection in session state
        this.sessionState.currentMenu = commandName;

        // Handle different commands
        switch (commandName) {
            case 'solve':
                this.showSolveForm(content);
                break;
            case 'memory':
                this.showMemoryBrowser(content);
                break;
            case 'dream':
                this.showDreamControls(content);
                break;
            case 'benchmark':
                this.showBenchmarkOptions(content);
                break;
            case 'demo':
                this.showDemoOptions(content);
                break;
            case 'config':
            case 'settings':
                this.showConfigForm(content);
                break;
            case 'export':
                this.showExportOptions(content);
                break;
            case 'system':
                this.showSystemDashboard(content);
                break;
            case 'help':
                this.showHelp(content);
                break;
            case 'exit':
                this.exitTUI();
                break;
            default:
                content.setContent(`Command ${commandName} not yet implemented.`);
        }

        this.screen.render();
    }

    private showSolveForm(content: any): void {
        const formContent = `
🧩 Solve Puzzle

Puzzle File: [${this.sessionState.formValues?.puzzleFile || 'puzzles/hard-01.json'}]

Memory System:
  ☑ AgentDB (enhanced, RL-enabled)
  ☐ ReasoningBank (stable, baseline)

Solving Parameters:
  Max Iterations:      [${this.sessionState.formValues?.maxIterations || 100}]
  Max Time (ms):       [${this.sessionState.formValues?.maxTime || 300000}]
  Reflection Interval: [${this.sessionState.formValues?.reflectionInterval || 5}]
  Attention Window:    [${this.sessionState.formValues?.attentionWindow || 10}]

Strategy Configuration:
  ☑ Naked Single        ☑ Hidden Single
  ☑ Pointing Pairs      ☑ Box-Line Reduction
  ☐ Naked Pairs         ☐ X-Wing
  ☐ XY-Wing             ☐ Swordfish

  ☑ Enable Backtracking
  Guess Threshold: [${this.sessionState.formValues?.guessThreshold || 0.3}]

Output Options:
  ☑ Live Visualization
  ☑ Export Trajectory
  ☑ Dream After Solving
  Save Results To: [results/solve-{timestamp}.json]

[  Start Solve  ]  [  Save Config  ]  [  Load Preset  ]  [  Cancel  ]

[F1] Help  [Tab] Next Field  [↑↓] Navigate  [Space] Toggle  [Enter] Submit
`;

        content.setContent(formContent);

        // Set up form navigation
        this.setupSolveFormNavigation(content);
    }

    private showMemoryBrowser(content: any): void {
        const memoryContent = `
🧠 Memory Browser

Search: [${this.sessionState.filterTerms?.memorySearch || ''}] [🔍] Type: [All ▼]

Results (47 items):
  ► Pattern: naked-single-basic                      Success: 94%
    Type: Strategy | Created: 2h ago | Used: 127 times
    Description: Basic naked single detection in row/col/box
    Size: 2.3 KB | TTL: Persistent

  ► Skill: naked-single-advanced                    Success: 87%
    Type: Skill | Created: 1h ago | Used: 43 times
    Description: Advanced naked single with constraint chaining
    Size: 4.1 KB | TTL: 30 days

  ► Experience: solve-session-047
    Type: Experience | Created: 15m ago | Moves: 47
    Description: Solved hard-01.json using naked single strategy
    Size: 12.7 KB | TTL: 7 days

[Store] [Retrieve] [Delete] [Export] [Optimize] [Consolidate] [Backup]

[/] Search  [Enter] View  [Del] Delete  [E] Export              Page: 1/5
`;

        content.setContent(memoryContent);
    }

    private showDreamControls(content: any): void {
        const dreamContent = `
💭 Dream Controls

Dream Cycle Status:
  Last Run: 10:28 AM (2 hours ago)
  Next Scheduled: After next session
  Recent Results: 47→5 patterns consolidated

Run Dream Cycle:
  Sessions: [all recent]
  Phases: [all]
  Compression Ratio: [10]
  Abstraction Levels: [4]

  ☑ Visualize Process
  Save Results To: [results/dream-{timestamp}.json]

Schedule Options:
  ☑ Run after each session
  ☐ Periodic (every [10] sessions)
  ☐ Manual only

[  Run Dream Cycle  ]  [  View Status  ]  [  Configure Schedule  ]  [  Cancel  ]
`;

        content.setContent(dreamContent);
    }

    private showBenchmarkOptions(content: any): void {
        const benchmarkContent = `
📊 Benchmark Options

Benchmark Suites:
  ☑ Full Suite (comprehensive, all difficulties)
  ☐ Quick Suite (smoke test, easy/medium only)
  ☐ Memory Performance (AgentDB vs ReasoningBank)
  ☐ Solving Performance (strategy effectiveness)
  ☐ Transfer Learning (9x9 → 16x16)

Parameters:
  Baseline: [all]
  Difficulty: [all]
  Count per difficulty: [50]
  Parallel workers: [4]

Output Options:
  Output Directory: [benchmarks/{date}]
  Format: [markdown]
  ☑ Generate Charts
  ☐ Include Raw Data

[  Run Benchmark  ]  [  View Reports  ]  [  Compare Results  ]  [  Cancel  ]
`;

        content.setContent(benchmarkContent);
    }

    private showDemoOptions(content: any): void {
        const demoContent = `
🎬 Demo Options

Available Demos:
  👥 Stakeholder Presentation (10-minute, 5 acts)
  ⚡ Quick Solve Demo (30-second demonstration)
  🔄 Transfer Learning Demo (9x9 → 16x16)
  🌙 Dreaming Visualization (consolidation process)
  ⚖️ Baseline Comparison (side-by-side analysis)

Demo Settings:
  Speed: [realtime]
  ☑ Pause after each step
  ☐ Export recording to [demo-recording.txt]
  ☐ Skip Act: [none]

[  Run Demo  ]  [  View Script  ]  [  Configure Settings  ]  [  Cancel  ]
`;

        content.setContent(demoContent);
    }

    private showConfigForm(content: any): void {
        const configContent = `
⚙️ Configuration

Current Configuration:
  Memory System: [agentdb]
  Enable RL: [true]
  Enable Reflexion: [true]
  Enable Skill Library: [true]

Solving Parameters:
  Max Iterations: [100]
  Max Solve Time: [300000]
  Reflection Interval: [5]
  Attention Window: [10]
  Backtrack Enabled: [true]
  Guess Threshold: [0.3]
  Strategies: [naked-single,hidden-single,pointing-pairs,box-line-reduction]

Dreaming Configuration:
  Schedule: [after-session]
  Compression Ratio: [10]
  Abstraction Levels: [4]
  Min Success Rate: [0.7]

[  View Full Config  ]  [  Edit Settings  ]  [  Validate Config  ]  [  Export Config  ]
`;

        content.setContent(configContent);
    }

    private showExportOptions(content: any): void {
        const exportContent = `
📤 Export Options

Export Type:
  ☑ Metrics (performance data)
  ☑ Results (solve outcomes)
  ☑ Memory (knowledge patterns)
  ☐ Configuration
  ☐ Logs

Parameters:
  Output Directory: [export/{date}]
  Format: [json]
  ☑ Compress exported data
  ☐ Include raw data

Session Filter:
  Sessions: [all]
  Date Range: [all]

[  Export All  ]  [  Export Selected  ]  [  View Exports  ]  [  Cancel  ]
`;

        content.setContent(exportContent);
    }

    private showSystemDashboard(content: any): void {
        const dashboardContent = `
📊 System Dashboard

System Status:
  Memory System:  ✓ AgentDB (RL: ON, Reflexion: ON)
  Sessions:       47 total, 3 today
  Database:       ✓ Healthy (.agentdb/agent.db - 47.3 MB)
  Uptime:         2h 34m

Recent Activity:
  10:34 | Solved hard-01.json (47 iterations, 12.4s)
  10:28 | Dream cycle completed (47→5 patterns)
  10:15 | Memory optimized (150 patterns → 47 skills)
  10:05 | Benchmark completed (95% success rate)

Quick Actions:
  [1] Quick Solve   [2] Memory Browser   [3] Dream Cycle
  [4] Run Demo      [5] Benchmark        [6] System Health

Performance Metrics:
  Avg Solve Time: ████████░░░░░░░░░░ 8.3s (target: 10s)
  Memory Usage:   ███████░░░░░░░░░░░ 342 MB (limit: 2GB)
  Success Rate:   ████████████████░░ 87% (target: 80%)

[  Refresh  ]  [  System Status  ]  [  Cleanup  ]  [  Settings  ]
`;

        content.setContent(dashboardContent);
    }

    private showHelp(content: any): void {
        const terminalInfo = this.terminalInfo;

        const envSection = `
📋 ENVIRONMENT INFO
Terminal: ${terminalInfo.term} (${terminalInfo.columns}x${terminalInfo.rows})
Colors: ${terminalInfo.supportsColor ? '✅' : '❌'} | Unicode: ${terminalInfo.supportsUnicode ? '✅' : '❌'}
Mouse: ${terminalInfo.supportsMouse ? '✅' : '❌'} | TTY: ${terminalInfo.isTTY ? '✅' : '❌'}
Platform: ${terminalInfo.isWindows ? 'Windows' : terminalInfo.isWSL ? 'WSL' : 'Unix'}
Environment: ${terminalInfo.isCI ? 'CI' : terminalInfo.isDocker ? 'Docker' : 'Local'}

`;

        const helpContent = `
ℹ️ Help - Machine Dream TUI

${envSection}KEYBOARD SHORTCUTS:
  F1          - Help (context-sensitive)
  F2          - Quick access to Config
  F3          - Search/Find
  F10         - Toggle menu
  Ctrl+C      - Exit application
  Ctrl+R      - Refresh current view
  Ctrl+S      - Save current state
  Ctrl+L      - Clear screen/logs
  Ctrl+P      - Open command palette

NAVIGATION:
  ↑ ↓         - Navigate menu items / table rows
  ← →         - Navigate menu hierarchy / table columns
  Tab         - Next field / Next section
  Shift+Tab   - Previous field / Previous section
  Enter       - Select / Submit / Execute
  Esc         - Cancel / Go back / Close modal
  Home        - First item / Top of list
  End         - Last item / Bottom of list
  PgUp/PgDn   - Scroll page up/down

MENU SHORTCUTS:
  S           - Solve Puzzle
  M           - Memory Browser
  D           - Dream Cycle
  B           - Benchmark
  O           - Demo
  C           - Config
  E           - Export
  Y           - System Utilities
  H           - Help
  Q           - Quit

FORM SHORTCUTS:
  Space       - Toggle checkbox / Radio button
  ↑ ↓         - Adjust slider / dropdown selection
  ← →         - Adjust numeric values
  Ctrl+Enter  - Submit form
  Ctrl+W      - Close without saving

DATA VIEW SHORTCUTS:
  /           - Search / Filter
  N           - Next result
  P           - Previous result
  R           - Refresh data
  E           - Export current view
  V           - View details
  D           - Delete selected
  Ctrl+A      - Select all
  Ctrl+D      - Deselect all

[  Close Help  ]  [  Tutorial  ]  [  Keyboard Shortcuts  ]  [  About  ]
`;

        content.setContent(helpContent);
    }

    private setupSolveFormNavigation(content: any): void {
        // This would set up form field navigation and submission
        // For now, we'll just set up a simple submit handler
        this.screen.key(['enter'], () => {
            const puzzleFile = this.sessionState.formValues?.puzzleFile || 'puzzles/hard-01.json';
            const command = `solve ${puzzleFile} --memory-system agentdb --enable-rl --max-iterations 100`;

            content.setContent(`Executing: machine-dream ${command}\n\nPlease wait...`);
            this.screen.render();

            // Execute the CLI command
            executeCLICommand(command)
                .then(result => {
                    content.setContent(`Command executed successfully:\n\n${JSON.stringify(result, null, 2)}`);
                    this.screen.render();
                })
                .catch(error => {
                    content.setContent(`Command failed:\n\n${error.message}`);
                    this.screen.render();
                });
        });
    }

    private setupMenuShortcuts(menu: any): void {
        // Set up keyboard shortcuts for menu items
        Object.entries(this.commandMapping).forEach(([key, cmd]) => {
            if ((cmd as any).shortcut) {
                this.screen.key((cmd as any).shortcut.toLowerCase(), () => {
                    // Find the menu item index
                    const items = menu.getItems();
                    const itemIndex = items.findIndex((item: string) =>
                        item.toLowerCase().includes(key.toLowerCase())
                    );

                    if (itemIndex >= 0) {
                        menu.select(itemIndex);
                        this.handleMenuSelection(items[itemIndex], menu.parent);
                    }
                });
            }
        });

        // Help shortcut
        this.screen.key(['f1'], () => {
            const content = (menu.parent as any).getSibling('content') as any;
            this.showHelp(content);
            this.screen.render();
        });

        // Menu toggle shortcut
        this.screen.key(['f10'], () => {
            menu.focus();
            this.screen.render();
        });
    }

    private updateStatusBar(statusBar: any): void {
        // Update status bar with dynamic information
        const memoryUsage = '342 MB';

        // Add terminal environment info
        let envInfo = '';
        if (this.terminalInfo) {
            const envFlags = [];
            if (this.terminalInfo.isCI) envFlags.push('CI');
            if (this.terminalInfo.isDocker) envFlags.push('Docker');
            if (this.terminalInfo.isWindows) envFlags.push('Windows');
            if (this.terminalInfo.isWSL) envFlags.push('WSL');

            if (envFlags.length > 0) {
                envInfo = ` [${envFlags.join(', ')}]`;
            }
        }

        const statusText = `[F1] Help  [F10] Menu  [Ctrl+C] Exit  TERM:${this.terminalInfo?.term || 'unknown'}${envInfo}  Memory: ${memoryUsage}`;

        statusBar.setContent(statusText);

        // Set up periodic updates
        if (this.options.behavior?.autoRefresh) {
            setInterval(() => {
                // In a real implementation, this would fetch current system status
                statusBar.setContent(statusText); // Just update with same text for now
                this.screen.render();
            }, this.options.behavior.refreshInterval || 5000);
        }
    }

    private setupGlobalKeyBindings(): void {
        // Help - both F1 and Ctrl+H (VSCode may capture F1)
        this.screen.key(['f1', 'C-h'], () => {
            const content = (this.screen.children as any[]).find(child => child.type === 'box' && child.label === ' Content ' || child.label === ' Content (focused) ');
            if (content) {
                this.showHelp(content);
                this.screen.render();
            }
        });

        // Command palette
        this.screen.key(['C-p'], () => {
            this.showCommandPalette();
        });

        // Refresh
        this.screen.key(['C-r'], () => {
            const content = (this.screen.children as any[]).find(child => child.type === 'box' && (child.label === ' Content ' || child.label === ' Content (focused) '));
            if (content) {
                content.setContent('Refreshing...\n\nPlease wait.');
                this.screen.render();

                // Simulate refresh
                setTimeout(() => {
                    if (this.sessionState.currentMenu) {
                        this.handleMenuSelection(this.sessionState.currentMenu || 'dashboard', content);
                    } else {
                        this.showSystemDashboard(content);
                    }
                    this.screen.render();
                }, 500);
            }
        });

        // Content scrolling when content is focused
        this.screen.on('element focus', (element: any) => {
            if (element.label === ' Content (focused) ') {
                // Enable scrolling on focused content
                element.key(['up', 'k'], () => {
                    element.scroll(-1);
                    this.screen.render();
                });
                element.key(['down', 'j'], () => {
                    element.scroll(1);
                    this.screen.render();
                });
                element.key(['pageup'], () => {
                    element.scroll(-(element.height as number || 10));
                    this.screen.render();
                });
                element.key(['pagedown'], () => {
                    element.scroll(element.height as number || 10);
                    this.screen.render();
                });
            }
        });
    }

    private showCommandPalette(): void {
        const palette = blessed.box({
            top: 'center',
            left: 'center',
            width: '60%',
            height: '60%',
            border: {
                type: 'line'
            },
            style: {
                bg: this.currentTheme.bg.secondary,
                border: {
                    fg: this.currentTheme.ui.border
                }
            },
            scrollable: true,
            keys: true,
            vi: true
        });

        const searchInput = blessed.textbox({
            parent: palette,
            top: 2,
            left: 2,
            right: 2,
            height: 3,
            inputOnFocus: true,
            style: {
                fg: this.currentTheme.fg.primary,
                bg: this.currentTheme.bg.primary
            }
        });

        const resultsList = blessed.list({
            parent: palette,
            top: 6,
            left: 2,
            right: 2,
            bottom: 4,
            style: {
                fg: this.currentTheme.fg.primary,
                bg: this.currentTheme.bg.primary,
                selected: {
                    fg: this.currentTheme.fg.bright,
                    bg: this.currentTheme.bg.active
                }
            },
            keys: true,
            vi: true,
            items: this.getCommandPaletteItems()
        });

        blessed.box({
            parent: palette,
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            content: '[↑↓] Navigate  [Enter] Execute  [Esc] Cancel',
            style: {
                fg: this.currentTheme.fg.secondary,
                bg: this.currentTheme.bg.secondary
            },
            align: 'right'
        });

        // Set up search functionality
        searchInput.on('submit', (value: string) => {
            const filteredItems = this.getCommandPaletteItems().filter(item =>
                item.toLowerCase().includes(value.toLowerCase())
            );
            resultsList.setItems(filteredItems);
            this.screen.render();
        });

        // Set up selection
        resultsList.on('select', (item: any, _index: number) => {
            const selectedText = item.getText();
            const match = selectedText.match(/^.*?(\w+)/);
            const commandName = match ? match[1].toLowerCase() : '';

            palette.destroy();
            this.screen.render();

            if (commandName) {
                const content = this.screen.children.find((child: any) => child.type === 'box' && child.width === '100%-20') as any;
                if (content) {
                    this.sessionState.currentMenu = commandName;
                    this.handleMenuSelection(commandName, content);
                }
            }
        });

        // Set up cancel
        this.screen.key(['escape'], () => {
            palette.destroy();
            this.screen.render();
        }, { once: true });

        this.screen.append(palette);
        searchInput.focus();
        this.screen.render();
    }

    private getCommandPaletteItems(): string[] {
        const items: string[] = [];

        // Add top-level commands
        for (const [key, cmd] of Object.entries(this.commandMapping)) {
            items.push(`${cmd.icon || ''} ${key.padEnd(20)} ${cmd.description}`);

            // Add subcommands if they exist
            if (cmd.subcommands) {
                for (const [subKey, subCmd] of Object.entries(cmd.subcommands)) {
                    items.push(`  ${subCmd.icon || ''} ${key}.${subKey.padEnd(18)} ${subCmd.description}`);
                }
            }
        }

        return items;
    }

    public exitTUI(): void {
        logger.info('Exiting Machine Dream TUI...');
        this.screen.destroy();
        process.exit(0);
    }
}