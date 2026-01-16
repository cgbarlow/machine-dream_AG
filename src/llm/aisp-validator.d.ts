/**
 * Type declarations for aisp-validator npm package
 */

declare module 'aisp-validator' {
  export interface AISPValidationResult {
    valid: boolean;
    tier: string;
    tierValue: number;
    tierName: string;
    delta: number;
    pureDensity: number;
    ambiguity?: number;
    error?: string;
    errorCode?: number;
  }

  export interface AISPDebugResult {
    tier: string;
    tierValue: number;
    tierName: string;
    delta: number;
    pureDensity: number;
    blockScore: number;
    bindingScore: number;
    breakdown: {
      blocksFound: number;
      blocksRequired: number;
      definitions: number;
      assignments: number;
      quantifiers: number;
      lambdas: number;
      implications: number;
      setOps: number;
      totalBindings: number;
      symbolCount: number;
      tokenCount: number;
    };
  }

  const AISP: {
    init(wasmPath?: string): Promise<number>;
    validate(source: string): AISPValidationResult;
    debug(source: string): AISPDebugResult;
    isValid(source: string): boolean;
    getDensity(source: string): number;
    getTier(source: string): string;
    validateFile(filePath: string): Promise<AISPValidationResult>;
    debugFile(filePath: string): Promise<AISPDebugResult>;
  };

  export default AISP;
}
