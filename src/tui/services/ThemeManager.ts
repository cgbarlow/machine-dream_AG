/**
 * Theme Manager
 *
 * Manages TUI color themes and provides theme switching.
 */

import { TUITheme } from '../types';

export const DARK_THEME: TUITheme = {
  name: 'dark',
  colors: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    border: '#3e3e3e',
    selected: '#264f78',
    focus: '#007acc',
    error: '#f48771',
    warning: '#cca700',
    success: '#89d185',
    info: '#75beff'
  },
  ui: {
    border: 'white',
    selectedBg: 'blue',
    selectedFg: 'white',
    focusBorder: 'cyan'
  }
};

export const LIGHT_THEME: TUITheme = {
  name: 'light',
  colors: {
    background: '#ffffff',
    foreground: '#000000',
    border: '#cccccc',
    selected: '#0060c0',
    focus: '#005fb8',
    error: '#e51400',
    warning: '#bf8803',
    success: '#107c10',
    info: '#0078d4'
  },
  ui: {
    border: 'black',
    selectedBg: 'blue',
    selectedFg: 'white',
    focusBorder: 'blue'
  }
};

export class ThemeManager {
  private currentTheme: TUITheme;

  constructor(themeName: 'dark' | 'light' | 'auto' = 'dark') {
    this.currentTheme = this.resolveTheme(themeName);
  }

  private resolveTheme(themeName: 'dark' | 'light' | 'auto'): TUITheme {
    if (themeName === 'auto') {
      // In auto mode, default to dark (could check system preference in the future)
      return DARK_THEME;
    }
    return themeName === 'light' ? LIGHT_THEME : DARK_THEME;
  }

  getTheme(): TUITheme {
    return this.currentTheme;
  }

  setTheme(themeName: 'dark' | 'light'): void {
    this.currentTheme = this.resolveTheme(themeName);
  }

  getColor(colorName: keyof TUITheme['colors']): string {
    return this.currentTheme.colors[colorName];
  }

  getUIStyle(styleName: keyof TUITheme['ui']): string {
    return this.currentTheme.ui[styleName];
  }
}
