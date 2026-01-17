import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.machine-dream', 'agentdb', 'agent.db');
const db = new Database(dbPath, { readonly: true });

console.log('Database Schema:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nTables:', tables.map(t => t.name).join(', '));

tables.forEach(table => {
  console.log(`\n${table.name} columns:`);
  const cols = db.prepare(`PRAGMA table_info(${table.name})`).all();
  cols.forEach(col => console.log(`  - ${col.name} (${col.type})`));
});

db.close();
