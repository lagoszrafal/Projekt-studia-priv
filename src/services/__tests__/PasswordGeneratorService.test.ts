import type { SecureRandom } from '@/crypto/Random';
import { PasswordGeneratorService } from '../PasswordGeneratorService';

class SequenceRandom implements SecureRandom {
  private next = 0;

  bytes(length: number): Uint8Array {
    return Uint8Array.from({ length }, () => this.next++ % 251);
  }
}

describe('PasswordGeneratorService', () => {
  it('generuje hasło o żądanej długości i z wybranych zestawów znaków', () => {
    const service = new PasswordGeneratorService(new SequenceRandom());
    const password = service.generate({
      length: 18,
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSymbols: true,
    });

    expect(password).toHaveLength(18);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/\d/.test(password)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
  });

  it('odrzuca konfigurację bez żadnych znaków', () => {
    const service = new PasswordGeneratorService(new SequenceRandom());

    expect(() => service.generate({
      length: 12,
      includeLowercase: false,
      includeUppercase: false,
      includeNumbers: false,
      includeSymbols: false,
    })).toThrow('Wybierz co najmniej jeden typ znaków.');
  });

  it('odrzuca długość, która nie mieści wszystkich wybranych typów znaków', () => {
    const service = new PasswordGeneratorService(new SequenceRandom());

    expect(() => service.generate({
      length: 3,
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSymbols: true,
    })).toThrow('Długość hasła musi wynosić co najmniej 4.');
  });
});
