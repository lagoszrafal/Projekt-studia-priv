import type { SQLiteDatabase } from 'expo-sqlite';
import { SQLiteVaultMetadataRepository } from '../SQLiteVaultMetadataRepository';

describe('SQLiteVaultMetadataRepository', () => {
  it('normalizuje klucz sejfu zapisany wcześniej jako BLOB', async () => {
    const db = {
      getFirstAsync: jest.fn(async () => ({
        kdf_metadata: JSON.stringify({
          algorithm: 'argon2id', version: 1, salt: '0102030405060708',
          memoryCost: 65_536, iterations: 3, parallelism: 1,
        }),
        wrapped_vault_key: new Uint8Array([1, 2, 3]),
        wrap_nonce: new Uint8Array([4, 5, 6]),
        wrap_authentication_tag: new Uint8Array([7, 8, 9]),
        crypto_version: 1,
        created_at: 10,
        updated_at: 20,
      })),
    } as unknown as SQLiteDatabase;

    const metadata = await new SQLiteVaultMetadataRepository(db).get();

    expect(metadata?.wrappedVaultKey).toEqual({
      ciphertext: 'AQID',
      nonce: 'BAUG',
      authenticationTag: 'BwgJ',
      cryptoVersion: 1,
    });
  });
});
