import { mapVaultRow, type VaultEntryRow } from '../SQLiteVaultRepository';

const row: VaultEntryRow = {
  id: '00000000-0000-4000-8000-000000000000',
  type: 'login',
  encrypted_payload: 'ciphertext-test-only',
  nonce: 'nonce-test-only',
  authentication_tag: null,
  crypto_version: 1,
  created_at: 100,
  updated_at: 200,
  deleted_at: null,
  sync_version: 1,
};

describe('mapVaultRow', () => {
  it('mapuje wyłącznie zaszyfrowany rekord', () => {
    expect(mapVaultRow(row)).toEqual({
      id: row.id,
      type: 'login',
      ciphertext: row.encrypted_payload,
      nonce: row.nonce,
      authenticationTag: undefined,
      cryptoVersion: 1,
      createdAt: 100,
      updatedAt: 200,
      deletedAt: null,
      syncVersion: 1,
    });
  });

  it('odrzuca nieobsługiwany typ przed odszyfrowaniem', () => {
    expect(() => mapVaultRow({ ...row, type: 'secure-note' })).toThrow('Nieobsługiwany typ wpisu');
  });

  it('normalizuje starsze pola BLOB do Base64 po ponownym uruchomieniu aplikacji', () => {
    const mapped = mapVaultRow({
      ...row,
      encrypted_payload: new Uint8Array([1, 2, 3]),
      nonce: new Uint8Array([4, 5, 6]),
      authentication_tag: new Uint8Array([7, 8, 9]),
    });

    expect(mapped.ciphertext).toBe('AQID');
    expect(mapped.nonce).toBe('BAUG');
    expect(mapped.authenticationTag).toBe('BwgJ');
  });
});
