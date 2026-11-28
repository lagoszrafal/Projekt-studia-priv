import { DEFAULT_KDF_PARAMETERS, type KdfMetadata } from '@/crypto/types';
import { decodeDatabaseBackup, encodeDatabaseBackup } from '../DatabaseBackupFormat';

const kdf: KdfMetadata = {
  ...DEFAULT_KDF_PARAMETERS,
  salt: '0102030405060708090a0b0c0d0e0f10',
};

describe('portable database backup format', () => {
  it('round-trips an encrypted database and its public KDF metadata', () => {
    const database = new Uint8Array([0x53, 0x51, 0x4c, 0x43, 1, 2, 3]);

    const result = decodeDatabaseBackup(encodeDatabaseBackup(database, kdf));

    expect(result.database).toEqual(database);
    expect(result.kdf).toEqual(kdf);
  });

  it('rejects a malformed package and unsupported KDF parameters', () => {
    expect(() => decodeDatabaseBackup(new Uint8Array(32))).toThrow('nie jest obsługiwana');
    expect(() => encodeDatabaseBackup(new Uint8Array([1]), { ...kdf, memoryCost: 1 })).toThrow(
      'Nieobsługiwane parametry szyfrowania',
    );
  });
});
