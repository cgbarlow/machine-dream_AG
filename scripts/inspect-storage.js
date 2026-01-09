#!/usr/bin/env node
/**
 * Inspect AgentDB storage to verify importance scoring
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const dbPath = join(homedir(), '.machine-dream', 'agentdb', 'agent.db');
const db = new Database(dbPath, { readonly: true });

console.log('📊 Storage Inspection Report\n');

// 1. Count total experiences
const totalCount = db.prepare('SELECT COUNT(*) as count FROM metadata WHERE type = ?').get('llm_experience');
console.log(`Total LLM Experiences: ${totalCount.count}\n`);

// 2. Get most recent experiences with importance
console.log('🔍 Recent Experiences (with importance):');
const recentExps = db.prepare(`
  SELECT key, data
  FROM metadata
  WHERE type = 'llm_experience'
  ORDER BY timestamp DESC
  LIMIT 10
`).all();

recentExps.forEach((row, idx) => {
  const data = JSON.parse(row.data);
  const importance = data.importance ?? 'NOT SET';
  const outcome = data.validation?.outcome || 'unknown';
  const move = data.move ? `(${data.move.row},${data.move.col})=${data.move.value}` : 'unknown';

  console.log(`  ${idx + 1}. ${move} → ${outcome.toUpperCase()}`);
  console.log(`     Importance: ${typeof importance === 'number' ? importance.toFixed(3) : importance}`);

  if (data.context) {
    console.log(`     Context: emptyCells=${data.context.emptyCellsAtMove}, reasoning=${data.context.reasoningLength}chars, density=${data.context.constraintDensity}`);
  } else {
    console.log(`     Context: NOT SET`);
  }
  console.log('');
});

// 3. Importance statistics
console.log('\n📈 Importance Distribution:');
const withImportance = db.prepare(`
  SELECT COUNT(*) as count
  FROM metadata
  WHERE type = 'llm_experience'
  AND json_extract(data, '$.importance') IS NOT NULL
`).get();

const withoutImportance = totalCount.count - withImportance.count;

console.log(`  With importance: ${withImportance.count} (${((withImportance.count / totalCount.count) * 100).toFixed(1)}%)`);
console.log(`  Without importance: ${withoutImportance} (${((withoutImportance / totalCount.count) * 100).toFixed(1)}%)`);

// 4. Sample high-importance experiences
console.log('\n⭐ High Importance Experiences (>0.8):');
const highImportance = db.prepare(`
  SELECT key, data
  FROM metadata
  WHERE type = 'llm_experience'
  AND CAST(json_extract(data, '$.importance') AS REAL) > 0.8
  ORDER BY CAST(json_extract(data, '$.importance') AS REAL) DESC
  LIMIT 5
`).all();

if (highImportance.length > 0) {
  highImportance.forEach((row, idx) => {
    const data = JSON.parse(row.data);
    const move = data.move ? `(${data.move.row},${data.move.col})=${data.move.value}` : 'unknown';
    const outcome = data.validation?.outcome || 'unknown';

    console.log(`  ${idx + 1}. ${move} → ${outcome.toUpperCase()}`);
    console.log(`     Importance: ${data.importance.toFixed(3)}`);
    console.log(`     Reasoning: ${data.move.reasoning.substring(0, 100)}...`);
    console.log('');
  });
} else {
  console.log('  None found (all experiences < 0.8 importance)');
}

// 5. Importance by outcome type
console.log('\n📊 Average Importance by Outcome:');
const byOutcome = db.prepare(`
  SELECT
    json_extract(data, '$.validation.outcome') as outcome,
    COUNT(*) as count,
    AVG(CAST(json_extract(data, '$.importance') AS REAL)) as avg_importance
  FROM metadata
  WHERE type = 'llm_experience'
  AND json_extract(data, '$.importance') IS NOT NULL
  GROUP BY outcome
`).all();

byOutcome.forEach(row => {
  console.log(`  ${row.outcome}: ${row.avg_importance ? row.avg_importance.toFixed(3) : 'N/A'} (${row.count} experiences)`);
});

db.close();
console.log('\n✅ Inspection complete!\n');
