import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import type { EncryptedPayload } from '../types';
import { combineEncryptedPayload, ExpoCryptoProvider } from '../ExpoCryptoProvider';

jest.mock('@sonnetstationsolutions/expo-argon2', () => ({ argon2id: jest.fn() }));
jest.mock('expo-crypto', () => ({
  AESEncryptionKey: { import: jest.fn() },
  AESSealedData: { fromCombined: jest.fn() },
  aesDecryptAsync: jest.fn(),
  aesEncryptAsync: jest.fn(),
  getRandomBytes: jest.fn(),
}));

describe('combineEncryptedPayload', () => {
  it('tworzy jednoznaczny bufor AES-GCM z nonce, szyfrogramu i 16-bajtowego tagu', () => {
    const payload: EncryptedPayload = {
      ciphertext: 'AQID',
      nonce: 'AAECAwQFBgcICQoL',
      authenticationTag: 'EBESExQVFhcYGRobHB0eHw==',
      cryptoVersion: 1,
    };

    expect(combineEncryptedPayload(payload)).toEqual(new Uint8Array([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
      1, 2, 3,
      16, 17, 18, 19, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30, 31,
    ]));
  });

  it('odrzuca brakujący albo nieprawidłowej długości tag', () => {
    const base: EncryptedPayload = { ciphertext: 'AQID', nonce: 'AAECAwQFBgcICQoL', cryptoVersion: 1 };

    expect(() => combineEncryptedPayload(base)).toThrow('wersja szyfrowania');
    expect(() => combineEncryptedPayload({ ...base, authenticationTag: 'AQID' })).toThrow('wersja szyfrowania');
    expect(() => combineEncryptedPayload({ ...base, nonce: 'AQID', authenticationTag: 'EBESExQVFhcYGRobHB0eHw==' })).toThrow('wersja szyfrowania');
  });

  it('odszyfrowuje przez jednoznaczne fromCombined zamiast fromParts', async () => {
    const payload: EncryptedPayload = {
      ciphertext: 'AQID',
      nonce: 'AAECAwQFBgcICQoL',
      authenticationTag: 'EBESExQVFhcYGRobHB0eHw==',
      cryptoVersion: 1,
    };
    const nativeKey = {} as Awaited<ReturnType<typeof AESEncryptionKey.import>>;
    const sealed = {} as ReturnType<typeof AESSealedData.fromCombined>;
    jest.mocked(AESEncryptionKey.import).mockResolvedValue(nativeKey);
    jest.mocked(AESSealedData.fromCombined).mockReturnValue(sealed);
    jest.mocked(aesDecryptAsync).mockResolvedValue(new Uint8Array([7, 8, 9]));

    await expect(new ExpoCryptoProvider().decrypt(payload, { bytes: new Uint8Array(32) })).resolves.toEqual(new Uint8Array([7, 8, 9]));

    expect(AESSealedData.fromCombined).toHaveBeenCalledWith(
      combineEncryptedPayload(payload),
      { ivLength: 12, tagLength: 16 },
    );
  });

  it('zawsze koduje natywne bajty AES do tekstu Base64 przed zapisem w SQLite', async () => {
    const nativeKey = {} as Awaited<ReturnType<typeof AESEncryptionKey.import>>;
    const sealed = {
      ciphertext: jest.fn(async () => new Uint8Array([1, 2, 3])),
      iv: jest.fn(async () => new Uint8Array([4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])),
      tag: jest.fn(async () => new Uint8Array(16).fill(16)),
    };
    jest.mocked(AESEncryptionKey.import).mockResolvedValue(nativeKey);
    jest.mocked(aesEncryptAsync).mockResolvedValue(sealed as unknown as Awaited<ReturnType<typeof aesEncryptAsync>>);

    const encrypted = await new ExpoCryptoProvider().encrypt(
      new Uint8Array([9]),
      { bytes: new Uint8Array(32) },
    );

    expect(encrypted.ciphertext).toBe('AQID');
    expect(encrypted.nonce).toBe('BAUGBwgJCgsMDQ4P');
    expect(encrypted.authenticationTag).toBe('EBAQEBAQEBAQEBAQEBAQEA==');
    expect(sealed.ciphertext).toHaveBeenCalledWith();
  });
});
