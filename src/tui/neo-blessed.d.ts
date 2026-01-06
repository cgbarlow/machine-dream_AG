/**
 * Type declarations for neo-blessed
 *
 * neo-blessed is a drop-in replacement for blessed with Node.js v20+ compatibility fixes.
 * We use the blessed type definitions since the APIs are identical.
 */

declare module 'neo-blessed' {
  import blessed = require('blessed');
  export = blessed;
}
