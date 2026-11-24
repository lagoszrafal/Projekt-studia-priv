import type { SQLiteDatabase } from 'expo-sqlite';
import type { EncryptedVaultRecord, VaultRepository } from './VaultRepository';
import { ensureBase64String } from '@/utils/base64';

export type VaultEntryRow = {
  id: string;
  type: string;
  encrypted_payload: string | Uint8Array;
  nonce: string | Uint8Array;
  authentication_tag: string | Uint8Array | null;
  crypto_version: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  sync_version: number;
};

export function mapVaultRow(row: VaultEntryRow): EncryptedVaultRecord {
  if (row.type !== 'login') throw new Error(`Nieobsługiwany typ wpisu: ${row.type}`);
  return {
    id: row.id,
    type: row.type,
    ciphertext: ensureBase64String(row.encrypted_payload),
    nonce: ensureBase64String(row.nonce),
    authenticationTag: row.authentication_tag === null ? undefined : ensureBase64String(row.authentication_tag),
    cryptoVersion: row.crypto_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncVersion: row.sync_version,
  };
}

const SELECT_COLUMNS = `id, type, encrypted_payload, nonce, authentication_tag,
  crypto_version, created_at, updated_at, deleted_at, sync_version`;

export class SQLiteVaultRepository implements VaultRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getAll(): Promise<EncryptedVaultRecord[]> {
    const rows = await this.db.getAllAsync<VaultEntryRow>(
      `SELECT ${SELECT_COLUMNS} FROM vault_entries WHERE deleted_at IS NULL ORDER BY updated_at DESC`,
    );
    return rows.map(mapVaultRow);
  }

  async getById(id: string): Promise<EncryptedVaultRecord | null> {
    const row = await this.db.getFirstAsync<VaultEntryRow>(
      `SELECT ${SELECT_COLUMNS} FROM vault_entries WHERE id = ? AND deleted_at IS NULL`,
      id,
    );
    return row ? mapVaultRow(row) : null;
  }

  async insert(record: EncryptedVaultRecord): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO vault_entries
        (id, type, encrypted_payload, nonce, authentication_tag, crypto_version,
         created_at, updated_at, deleted_at, sync_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      record.id, record.type, record.ciphertext, record.nonce,
      record.authenticationTag ?? null, record.cryptoVersion, record.createdAt,
      record.updatedAt, record.deletedAt, record.syncVersion,
    );
  }

  async update(record: EncryptedVaultRecord): Promise<void> {
    const result = await this.db.runAsync(
      `UPDATE vault_entries SET encrypted_payload = ?, nonce = ?, authentication_tag = ?,
       crypto_version = ?, updated_at = ?, deleted_at = ?, sync_version = ?
       WHERE id = ?`,
      record.ciphertext, record.nonce, record.authenticationTag ?? null,
      record.cryptoVersion, record.updatedAt, record.deletedAt, record.syncVersion, record.id,
    );
    if (result.changes !== 1) throw new Error('Nie znaleziono wpisu do aktualizacji.');
  }

  async delete(id: string): Promise<void> {
    const result = await this.db.runAsync(
      `UPDATE vault_entries SET deleted_at = ?, updated_at = ?, sync_version = sync_version + 1
       WHERE id = ? AND deleted_at IS NULL`,
      Date.now(), Date.now(), id,
    );
    if (result.changes !== 1) throw new Error('Nie znaleziono wpisu do usunięcia.');
  }
}
