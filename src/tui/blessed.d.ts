/**
 * Type declarations for blessed module
 */

declare module 'blessed' {
    export function screen(options?: any): any;
    export function box(options?: any): any;
    export function list(options?: any): any;
    export function textbox(options?: any): any;
    export function progressbar(options?: any): any;
    export function table(options?: any): any;
    export function form(options?: any): any;
    export function button(options?: any): any;

    // Add more blessed components as needed
    export const widgets: any;
}