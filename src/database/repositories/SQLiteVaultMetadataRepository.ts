import type { SQLiteDatabase } from 'expo-sqlite';
import type { KdfMetadata } from '@/crypto/types';
import type { VaultMetadata, VaultMetadataRepository } from './VaultMetadataRepository';
import { VaultCorruptedError } from '@/utils/errors';
import { ensureBase64String } from '@/utils/base64';

type MetadataRow = {
  kdf_metadata: string;
  wrapped_vault_key: string | Uint8Array;
  wrap_nonce: string | Uint8Array;
  wrap_authentication_tag: string | Uint8Array | null;
  crypto_version: number;
  created_at: number;
  updated_at: number;
};

export class SQLiteVaultMetadataRepository implements VaultMetadataRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async exists(): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM vault_metadata WHERE id = 1',
    );
    return row?.count === 1;
  }

  async get(): Promise<VaultMetadata | null> {
    const row = await this.db.getFirstAsync<MetadataRow>(
      `SELECT kdf_metadata, wrapped_vault_key, wrap_nonce, wrap_authentication_tag,
       crypto_version, created_at, updated_at FROM vault_metadata WHERE id = 1`,
    );
    if (!row) return null;
    if (!row.wrap_authentication_tag) throw new VaultCorruptedError();
    try {
      return {
        kdf: JSON.parse(row.kdf_metadata) as KdfMetadata,
        wrappedVaultKey: {
          ciphertext: ensureBase64String(row.wrapped_vault_key),
          nonce: ensureBase64String(row.wrap_nonce),
          authenticationTag: ensureBase64String(row.wrap_authentication_tag),
          cryptoVersion: row.crypto_version,
        },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      if (error instanceof VaultCorruptedError) throw error;
      throw new VaultCorruptedError();
    }
  }

  async create(metadata: VaultMetadata): Promise<void> {
    const tag = metadata.wrappedVaultKey.authenticationTag;
    if (!tag) throw new VaultCorruptedError();
    await this.db.runAsync(
      `INSERT INTO vault_metadata
       (id, kdf_metadata, wrapped_vault_key, wrap_nonce, wrap_authentication_tag,
        crypto_version, created_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
      JSON.stringify(metadata.kdf),
      metadata.wrappedVaultKey.ciphertext,
      metadata.wrappedVaultKey.nonce,
      tag,
      metadata.wrappedVaultKey.cryptoVersion,
      metadata.createdAt,
      metadata.updatedAt,
    );
  }

}
