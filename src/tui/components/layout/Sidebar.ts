/**
 * Sidebar Component
 *
 * Navigation menu sidebar.
 */

import blessed, { Widgets } from 'neo-blessed';
import { Component } from '../base/Component';
import { OutputManager } from '../../services/OutputManager';
import { ThemeManager } from '../../services/ThemeManager';
import { MenuItem } from '../../types';
import { formatMenuItem } from '../../utils/textAlign';

export class Sidebar extends Component {
  private themeManager: ThemeManager;
  private menuItems: MenuItem[];
  private list?: Widgets.ListElement;
  private selectedIndex = 0;
  private onSelect?: (item: MenuItem) => void;

  constructor(
    outputManager: OutputManager,
    themeManager: ThemeManager,
    options: {
      menuItems: MenuItem[];
      onSelect?: (item: MenuItem) => void;
    }
  ) {
    super(outputManager, {
      width: '20%',
      height: '100%-3', // Account for header and status bar
      top: 2,
      left: 0
    });
    this.themeManager = themeManager;
    this.menuItems = options.menuItems;
    this.onSelect = options.onSelect;
  }

  render(): Widgets.ListElement {
    const theme = this.themeManager.getTheme();

    this.list = blessed.list({
      top: this.props.top,
      left: this.props.left,
      width: this.props.width,
      height: this.props.height,
      label: ' {bold}Menu{/bold} ',
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        border: {
          fg: theme.ui.border
        },
        selected: {
          bg: theme.ui.selectedBg,
          fg: theme.ui.selectedFg,
          bold: true
        },
        focus: {
          border: {
            fg: theme.ui.focusBorder
          }
        }
      },
      items: this.formatMenuItems()
    });

    // Handle selection
    this.list.on('select', (_item, index) => {
      this.handleSelection(index);
    });

    // Handle key presses
    this.list.key(['enter'], () => {
      this.handleSelection((this.list as any)?.selected || 0);
    });

    return this.list;
  }

  private formatMenuItems(): string[] {
    return this.menuItems.map(item => {
      return formatMenuItem(item.icon, item.label, item.shortcut);
    });
  }

  private handleSelection(index: number): void {
    if (index < 0 || index >= this.menuItems.length) {
      return;
    }

    this.selectedIndex = index;
    const selectedItem = this.menuItems[index];

    this.emit('navigation', {
      from: 'menu',
      to: selectedItem.screen,
      item: selectedItem.id
    });

    if (this.onSelect) {
      this.onSelect(selectedItem);
    }
  }

  selectItem(index: number): void {
    if (this.list) {
      this.list.select(index);
      this.handleSelection(index);
    }
  }

  getSelectedItem(): MenuItem | undefined {
    return this.menuItems[this.selectedIndex];
  }
}
