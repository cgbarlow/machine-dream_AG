/**
 * Seeded Pseudo-Random Number Generator (PRNG)
 *
 * Implements Mulberry32 algorithm for deterministic randomness.
 * Allows exact puzzle recreation from seed numbers.
 *
 * Spec: 12-randomized-puzzle-generation.md
 */

/**
 * Mulberry32 - Fast, high-quality 32-bit PRNG
 *
 * Source: https://stackoverflow.com/a/47593316
 * Period: 2^32
 * Quality: Passes PractRand and BigCrush statistical tests
 */
export class SeededRandom {
  private state: number;
  private readonly originalSeed: number;

  /**
   * @param seed - Integer seed (0 to 2^32-1)
   */
  constructor(seed: number) {
    // Ensure seed is a positive 32-bit integer
    this.originalSeed = Math.abs(Math.floor(seed)) >>> 0;
    this.state = this.originalSeed;
  }

  /**
   * Returns the original seed used to initialize this PRNG
   */
  public getSeed(): number {
    return this.originalSeed;
  }

  /**
   * Reset PRNG to initial seed state
   */
  public reset(): void {
    this.state = this.originalSeed;
  }

  /**
   * Generate next random number in range [0, 1)
   *
   * Mulberry32 algorithm implementation
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer in range [min, max] (inclusive)
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (inclusive)
   */
  public nextInt(min: number, max: number): number {
    if (min > max) {
      throw new Error(`Invalid range: min (${min}) must be <= max (${max})`);
    }

    const range = max - min + 1;
    return Math.floor(this.next() * range) + min;
  }

  /**
   * Shuffle array in-place using Fisher-Yates algorithm with seeded randomness
   *
   * @param array - Array to shuffle (modified in-place)
   * @returns The same array, shuffled
   */
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Select random element from array
   *
   * @param array - Array to select from
   * @returns Random element, or undefined if array is empty
   */
  public choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Generate random sample of k elements from array (without replacement)
   *
   * @param array - Array to sample from
   * @param k - Number of elements to sample
   * @returns Array of k random elements
   */
  public sample<T>(array: T[], k: number): T[] {
    if (k > array.length) {
      throw new Error(`Sample size (${k}) exceeds array length (${array.length})`);
    }

    const copy = [...array];
    const result: T[] = [];

    for (let i = 0; i < k; i++) {
      const index = this.nextInt(0, copy.length - 1);
      result.push(copy[index]);
      copy.splice(index, 1);
    }

    return result;
  }

  /**
   * Generate random boolean with given probability of true
   *
   * @param probability - Probability of returning true (0.0 to 1.0)
   */
  public boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}
