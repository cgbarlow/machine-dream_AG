/**
 * AISP Strategy Encoder - Encode/decode strategies in AISP format
 * Specification: docs/specs/16-aisp-mode-spec.md
 *
 * Provides encoding of strategies in AISP syntax for storage and
 * injection into future prompts when using --aisp-full mode.
 */

import type { FewShotExample, SynthesizedPattern, SynthesizedAntiPattern } from './types.js';

/**
 * AISP Strategy Encoder
 *
 * Encodes synthesized strategies in AISP format for:
 * - Compact storage
 * - Lower-ambiguity prompt injection
 * - Formal reasoning chains
 */
export class AISPStrategyEncoder {
  /**
   * Encode a synthesized pattern in AISP format
   *
   * Output format:
   * ⟦Λ:Strategy.Name⟧{when≜condition;action≜effect;proof≜justification}
   */
  encodePattern(pattern: SynthesizedPattern): string {
    const name = pattern.isAnonymous
      ? `Pattern${pattern.sourceExperienceCount}`
      : this.sanitizeId(pattern.strategyName || 'Unknown');

    const parts: string[] = [];

    // When condition
    parts.push(`when≜${this.encodeCondition(pattern.whenToUse)}`);

    // Action steps
    if (pattern.reasoningSteps.length > 0) {
      const steps = pattern.reasoningSteps
        .map((step, i) => `step${i + 1}≔"${this.escapeString(step)}"`)
        .join(';');
      parts.push(`action≜⟨${steps}⟩`);
    } else if (pattern.reasoningTemplate) {
      parts.push(`template≜"${this.escapeString(pattern.reasoningTemplate)}"`);
    }

    // Success insight as proof
    if (pattern.successInsight) {
      parts.push(`proof≜"${this.escapeString(pattern.successInsight)}"`);
    }

    // Confidence level
    if (pattern.confidence > 0) {
      parts.push(`conf≔${pattern.confidence.toFixed(2)}`);
    }

    return `⟦Λ:Strategy.${name}⟧{${parts.join(';')}}`;
  }

  /**
   * Encode a few-shot example in AISP format
   *
   * Output format:
   * ⟦Λ:S.Name⟧{when≜cond;action≜steps;example≜(r,c,v)}
   */
  encodeFewShot(example: FewShotExample): string {
    const name = example.isAnonymous
      ? `Example`
      : this.sanitizeId(example.strategy || 'Example');

    const parts: string[] = [];

    // Situation as when condition
    parts.push(`when≜${this.encodeCondition(example.situation)}`);

    // Analysis as action
    if (example.reasoningTemplate) {
      parts.push(`template≜"${this.escapeString(example.reasoningTemplate)}"`);
    } else {
      parts.push(`action≜"${this.escapeString(example.analysis.substring(0, 100))}"`);
    }

    // Move as example
    parts.push(`example≜(${example.move.row},${example.move.col},${example.move.value})`);

    // Abstraction level
    parts.push(`level≔${example.abstractionLevel}`);

    return `⟦Λ:S.${name}⟧{${parts.join(';')}}`;
  }

  /**
   * Encode a synthesized anti-pattern in AISP format
   *
   * Output format:
   * ⟦Λ:AntiPattern.Name⟧{avoid≜mistake;why≜failure;prevent≜⟨steps⟩}
   *
   * Spec 19: Anti-patterns are encoded with "avoid" semantics
   */
  encodeAntiPattern(antiPattern: SynthesizedAntiPattern): string {
    const name = this.sanitizeId(antiPattern.antiPatternName || 'Unknown');

    const parts: string[] = [];

    // What goes wrong (avoid condition)
    parts.push(`avoid≜"${this.escapeString(antiPattern.whatGoesWrong)}"`);

    // Why it fails (failure justification)
    if (antiPattern.whyItFails) {
      parts.push(`why≜"${this.escapeString(antiPattern.whyItFails)}"`);
    }

    // Prevention steps
    if (antiPattern.preventionSteps && antiPattern.preventionSteps.length > 0) {
      const steps = antiPattern.preventionSteps
        .map((step, i) => `step${i + 1}≔"${this.escapeString(step)}"`)
        .join(';');
      parts.push(`prevent≜⟨${steps}⟩`);
    }

    // Frequency as confidence indicator
    if (antiPattern.frequency > 0) {
      parts.push(`freq≔${antiPattern.frequency}`);
    }

    return `⟦Λ:AntiPattern.${name}⟧{${parts.join(';')}}`;
  }

  /**
   * Decode AISP-encoded strategy to readable format
   *
   * Primarily for debugging and display purposes.
   */
  decodeToReadable(aispStrategy: string): string {
    // Extract block name
    const nameMatch = aispStrategy.match(/⟦Λ:([^⟧]+)⟧/);
    const name = nameMatch ? nameMatch[1] : 'Unknown';

    // Extract content between braces
    const contentMatch = aispStrategy.match(/\{([^}]+)\}/);
    if (!contentMatch) {
      return `Strategy: ${name}\n  (Could not parse content)`;
    }

    const content = contentMatch[1];
    const parts = content.split(';');

    const lines: string[] = [`Strategy: ${name}`];

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Parse key≜value or key≔value
      const match = trimmed.match(/^(\w+)([≜≔])(.+)$/);
      if (match) {
        const [, key, , value] = match;
        const label = this.keyToLabel(key);
        const decodedValue = this.decodeValue(value);
        lines.push(`  ${label}: ${decodedValue}`);
      } else {
        lines.push(`  ${trimmed}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Check if a string is AISP-encoded
   */
  isAISPEncoded(text: string): boolean {
    return text.includes('⟦Λ:') && text.includes('⟧{');
  }

  /**
   * Extract all AISP strategy blocks from text
   */
  extractStrategies(text: string): string[] {
    const pattern = /⟦Λ:[^⟧]+⟧\{[^}]+\}/g;
    return text.match(pattern) || [];
  }

  /**
   * Encode condition to AISP format
   */
  private encodeCondition(condition: string): string {
    const lower = condition.toLowerCase();

    // Pattern matching for common Sudoku conditions
    if (lower.includes('only one') || lower.includes('single')) {
      if (lower.includes('row')) return '∃!cell∈row:cell=0';
      if (lower.includes('column') || lower.includes('col')) return '∃!cell∈col:cell=0';
      if (lower.includes('box') || lower.includes('block')) return '∃!cell∈box:cell=0';
      if (lower.includes('candidate')) return '|candidates(cell)|=1';
    }

    if (lower.includes('missing')) {
      if (lower.includes('row')) return '∃v∈{1..9}:v∉row';
      if (lower.includes('column')) return '∃v∈{1..9}:v∉col';
      if (lower.includes('box')) return '∃v∈{1..9}:v∉box';
    }

    if (lower.includes('intersection')) {
      return 'candidates(cell)≔row∩col∩box';
    }

    // Default: quote the condition
    return `"${this.escapeString(condition.substring(0, 60))}"`;
  }

  /**
   * Sanitize identifier for AISP block names
   */
  private sanitizeId(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  }

  /**
   * Escape string for AISP encoding
   */
  private escapeString(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  /**
   * Convert AISP key to readable label
   */
  private keyToLabel(key: string): string {
    const labels: Record<string, string> = {
      'when': 'When',
      'action': 'Action',
      'template': 'Template',
      'proof': 'Why it works',
      'conf': 'Confidence',
      'example': 'Example move',
      'level': 'Abstraction level',
      'step1': 'Step 1',
      'step2': 'Step 2',
      'step3': 'Step 3',
      // Anti-pattern keys (Spec 19)
      'avoid': 'Avoid',
      'why': 'Why it fails',
      'prevent': 'Prevention',
      'freq': 'Frequency',
    };
    return labels[key] || key;
  }

  /**
   * Decode AISP value to readable format
   */
  private decodeValue(value: string): string {
    // Remove quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // Convert AISP symbols to readable text
    return value
      .replace(/∃!/g, 'exactly one ')
      .replace(/∃/g, 'exists ')
      .replace(/∀/g, 'for all ')
      .replace(/∈/g, ' in ')
      .replace(/∉/g, ' not in ')
      .replace(/∪/g, ' union ')
      .replace(/∩/g, ' intersect ')
      .replace(/≔/g, ' = ')
      .replace(/←/g, ' gets ')
      .replace(/⟨/g, '(')
      .replace(/⟩/g, ')');
  }
}
