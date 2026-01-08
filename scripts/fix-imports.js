#!/usr/bin/env node
/**
 * Post-build script to add .js extensions to local imports in compiled files
 * This is necessary for ESM modules in Node.js
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

async function fixImportsInFile(filePath) {
  const content = await readFile(filePath, 'utf-8');

  // Fix imports: from './xxx' -> from './xxx.js'
  // Fix imports: from '../xxx' -> from '../xxx.js'
  // Skip imports that already have .js or are from node_modules
  const fixed = content
    .replace(
      /from\s+(['"])(\.\.?\/[^'"]+)(?<!\.js)(?<!\.json)\1/g,
      (match, quote, path) => {
        // Don't add .js to paths that already have an extension or end with /
        if (path.endsWith('/') || path.match(/\.[a-z]+$/)) {
          return match;
        }
        return `from ${quote}${path}.js${quote}`;
      }
    );

  if (fixed !== content) {
    await writeFile(filePath, fixed, 'utf-8');
    console.log(`Fixed: ${filePath}`);
  }
}

async function processDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      await fixImportsInFile(fullPath);
    }
  }
}

console.log('Fixing import statements in dist/ ...');
await processDirectory(distDir);
console.log('Done!');
