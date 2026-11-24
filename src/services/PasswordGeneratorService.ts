import type { SecureRandom } from '@/crypto/Random';

export type PasswordGeneratorOptions = {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
};

export class PasswordGeneratorService {
  constructor(private readonly random: SecureRandom) {}

  generate({
    length,
    includeLowercase,
    includeUppercase,
    includeNumbers,
    includeSymbols,
  }: PasswordGeneratorOptions): string {
    if (!Number.isSafeInteger(length) || length <= 0) {
      throw new RangeError('Długość hasła musi być dodatnią liczbą całkowitą.');
    }

    const characterSets = [
      includeLowercase ? 'abcdefghijklmnopqrstuvwxyz' : null,
      includeUppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : null,
      includeNumbers ? '0123456789' : null,
      includeSymbols ? '!@#$%^&*()-_=+[]{};:,.<>/?' : null,
    ].filter((set): set is string => set !== null);

    if (!characterSets.length) throw new Error('Wybierz co najmniej jeden typ znaków.');
    if (length < characterSets.length) {
      throw new RangeError(`Długość hasła musi wynosić co najmniej ${characterSets.length}.`);
    }

    const pool = characterSets.join('');
    const result = characterSets.map((set) => this.pick(set));
    while (result.length < length) result.push(this.pick(pool));

    // Shuffle the mandatory characters so their positions do not reveal the selected sets.
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = this.randomIndex(index + 1);
      [result[index], result[target]] = [result[target] ?? '', result[index] ?? ''];
    }

    return result.join('');
  }

  private pick(characters: string): string {
    return characters[this.randomIndex(characters.length)] ?? '';
  }

  private randomIndex(upperExclusive: number): number {
    const unbiasedLimit = 256 - (256 % upperExclusive);
    while (true) {
      const value = this.random.bytes(1)[0];
      if (value !== undefined && value < unbiasedLimit) return value % upperExclusive;
    }
  }
}
