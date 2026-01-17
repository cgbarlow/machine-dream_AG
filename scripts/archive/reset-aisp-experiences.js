#!/usr/bin/env node

/**
 * Reset consolidated status for AISP experiences
 * This allows re-running dream consolidation without replaying puzzles
 */

import { AgentMemory } from '../dist/memory/AgentMemory.js';
import { ConfigManager } from '../dist/config/ConfigManager.js';

async function main() {
  const profileName = 'gpt-oss-120b';

  console.log(`\n🔄 Resetting consolidated status for profile: ${profileName}\n`);

  const config = new ConfigManager();
  const agentMemory = new AgentMemory(config);

  // Query all experiences for this profile
  const allExperiences = await agentMemory.reasoningBank.queryMetadata('llm_experience', {});
  const profileExperiences = allExperiences.filter((exp) => exp.profileName === profileName);

  console.log(`📊 Found ${profileExperiences.length} total experiences for ${profileName}`);

  // Count and reset consolidated experiences
  let resetCount = 0;
  for (const exp of profileExperiences) {
    if (exp.consolidated === true) {
      await agentMemory.reasoningBank.storeMetadata(
        exp.id,
        'llm_experience',
        { ...exp, consolidated: false }
      );
      resetCount++;
    }
  }

  console.log(`✅ Reset ${resetCount} experiences to unconsolidated status`);
  console.log(`📊 Remaining: ${profileExperiences.length - resetCount} already unconsolidated\n`);
}

main().catch(console.error);
