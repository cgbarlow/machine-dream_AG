/**
 * TUI Themes
 *
 * Color schemes and themes for the Terminal User Interface.
 */

import { TUITheme } from './types';

export const darkTheme: TUITheme = {
    // Background colors
    bg: {
        primary: '#1e1e1e',      // Main background
        secondary: '#252525',    // Panels, dialogs
        highlight: '#2d2d30',    // Hover states
        active: '#094771'        // Active selection
    },

    // Foreground colors
    fg: {
        primary: '#cccccc',      // Main text
        secondary: '#858585',    // Secondary text
        dim: '#555555',          // Disabled/dim text
        bright: '#ffffff'        // Emphasized text
    },

    // Semantic colors
    status: {
        success: '#4ec9b0',      // Green
        error: '#f48771',        // Red
        warning: '#dcdcaa',      // Yellow
        info: '#4fc1ff'          // Blue
    },

    // UI elements
    ui: {
        border: '#3e3e42',       // Borders
        borderActive: 'yellow',  // Active/focused border
        scrollbar: '#424242',    // Scrollbars
        shadow: '#00000050',     // Shadows
        focus: '#007acc'         // Focus outline
    },

    // Syntax highlighting
    syntax: {
        keyword: '#569cd6',      // Keywords
        string: '#ce9178',       // Strings
        number: '#b5cea8',       // Numbers
        comment: '#6a9955',      // Comments
        function: '#dcdcaa'      // Functions
    }
};

export const lightTheme: TUITheme = {
    bg: {
        primary: '#ffffff',
        secondary: '#f3f3f3',
        highlight: '#e8e8e8',
        active: '#0078d4'
    },

    fg: {
        primary: '#000000',
        secondary: '#616161',
        dim: '#a0a0a0',
        bright: '#000000'
    },

    status: {
        success: '#0e8a16',
        error: '#d73a49',
        warning: '#f9c513',
        info: '#0366d6'
    },

    ui: {
        border: '#d0d0d0',
        borderActive: 'blue',
        scrollbar: '#c0c0c0',
        shadow: '#00000020',
        focus: '#0078d4'
    }
};

export const highContrastTheme: TUITheme = {
    bg: {
        primary: '#000000',
        secondary: '#000000',
        highlight: '#000033',
        active: '#000066'
    },

    fg: {
        primary: '#ffffff',
        secondary: '#cccccc',
        dim: '#999999',
        bright: '#ffffff'
    },

    status: {
        success: '#00ff00',
        error: '#ff0000',
        warning: '#ffff00',
        info: '#00ffff'
    },

    ui: {
        border: '#ffffff',
        borderActive: 'cyan',
        scrollbar: '#cccccc',
        shadow: '#000000',
        focus: '#00ffff'
    }
};

// Get theme based on configuration
export function getTheme(themeName: 'dark' | 'light' | 'auto' = 'dark'): TUITheme {
    switch (themeName) {
        case 'light':
            return lightTheme;
        case 'dark':
            return darkTheme;
        case 'auto':
        default:
            // Auto mode - for now just use dark theme
            // In a real implementation, this would check system preferences
            return darkTheme;
    }
}