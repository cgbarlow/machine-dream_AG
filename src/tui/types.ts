/**
 * TUI Types and Interfaces
 *
 * Type definitions for the Terminal User Interface components.
 */

export interface TUIOptions {
    theme?: 'dark' | 'light' | 'auto';
    layout?: {
        menuWidth?: number;
        showStatusBar?: boolean;
        fontSize?: 'small' | 'normal' | 'large' | 'extra-large';
        animations?: boolean;
    };
    behavior?: {
        confirmDestructive?: boolean;
        autoRefresh?: boolean;
        refreshInterval?: number;
        mouseEnabled?: boolean;
        soundEnabled?: boolean;
    };
    shortcuts?: {
        custom?: Record<string, string>;
    };
    favorites?: string[];
    history?: {
        maxSize?: number;
        persistAcrossSessions?: boolean;
    };
}

export interface TUISessionState {
    currentMenu?: string;
    currentSubmenu?: string;
    formValues?: Record<string, any>;
    activeTabs?: Record<string, string>;
    scrollPositions?: Record<string, number>;
    filterTerms?: Record<string, string>;
    lastUpdated?: Date;
}

export interface TUICommandMapping {
    [key: string]: {
        command: string;
        description: string;
        icon?: string;
        shortcut?: string;
        subcommands?: TUICommandMapping;
    };
}

export interface TUITheme {
    bg: {
        primary: string;
        secondary: string;
        highlight: string;
        active: string;
    };
    fg: {
        primary: string;
        secondary: string;
        dim: string;
        bright: string;
    };
    status: {
        success: string;
        error: string;
        warning: string;
        info: string;
    };
    ui: {
        border: string;
        borderActive: string;
        scrollbar: string;
        shadow: string;
        focus: string;
    };
    syntax?: {
        keyword?: string;
        string?: string;
        number?: string;
        comment?: string;
        function?: string;
    };
}

export interface TUIComponentProps {
    id?: string;
    parent?: any;
    width?: string | number;
    height?: string | number;
    top?: string | number;
    left?: string | number;
    right?: string | number;
    bottom?: string | number;
    padding?: number | { top: number; right: number; bottom: number; left: number };
    margin?: number | { top: number; right: number; bottom: number; left: number };
    border?: {
        type?: 'line' | 'bg' | string;
        fg?: string;
        bg?: string;
    };
    style?: {
        fg?: string;
        bg?: string;
        bold?: boolean;
        underline?: boolean;
        italic?: boolean;
        blink?: boolean;
        inverse?: boolean;
    };
}