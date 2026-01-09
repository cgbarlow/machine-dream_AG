#!/usr/bin/env node
/**
 * Check session grouping in AgentDB
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.machine-dream', 'agentdb', 'agent.db');
const db = new Database(dbPath, { readonly: true });

console.log('🔍 Session Analysis\n');

// Get all experiences
const allExps = db.prepare(`
  SELECT data
  FROM metadata
  WHERE type = 'llm_experience'
`).all();

console.log(`Total experiences in DB: ${allExps.length}\n`);

// Parse and group by session
const sessionMap = new Map();

allExps.forEach(row => {
  const exp = JSON.parse(row.data);
  const key = `${exp.puzzleId}-${exp.profileName || 'default'}`;

  if (!sessionMap.has(key)) {
    sessionMap.set(key, {
      puzzleId: exp.puzzleId,
      profileName: exp.profileName || 'default',
      moves: [],
      firstTimestamp: new Date(exp.timestamp),
      lastTimestamp: new Date(exp.timestamp)
    });
  }

  const session = sessionMap.get(key);
  session.moves.push(exp);

  const timestamp = new Date(exp.timestamp);
  if (timestamp < session.firstTimestamp) {
    session.firstTimestamp = timestamp;
  }
  if (timestamp > session.lastTimestamp) {
    session.lastTimestamp = timestamp;
  }
});

console.log('📋 Sessions Found:\n');

for (const [sessionId, session] of sessionMap) {
  const durationMs = session.lastTimestamp - session.firstTimestamp;
  const durationMin = Math.round(durationMs / 60000);

  const correctMoves = session.moves.filter(m => m.validation?.isCorrect).length;
  const accuracy = (correctMoves / session.moves.length * 100).toFixed(1);

  console.log(`Session: ${sessionId}`);
  console.log(`  Total moves: ${session.moves.length}`);
  console.log(`  Correct: ${correctMoves} (${accuracy}%)`);
  console.log(`  Duration: ${durationMin} minutes`);
  console.log(`  First move: ${session.firstTimestamp.toLocaleString()}`);
  console.log(`  Last move: ${session.lastTimestamp.toLocaleString()}`);
  console.log('');
}

db.close();
