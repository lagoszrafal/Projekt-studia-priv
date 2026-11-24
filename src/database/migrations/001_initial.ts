import type { SQLiteDatabase } from 'expo-sqlite';

export async function migration001Initial(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS vault_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      kdf_metadata TEXT NOT NULL,
      wrapped_vault_key TEXT NOT NULL,
      wrap_nonce TEXT NOT NULL,
      crypto_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vault_entries (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      nonce TEXT NOT NULL,
      authentication_tag TEXT,
      crypto_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      encrypted_payload TEXT NOT NULL,
      nonce TEXT NOT NULL,
      crypto_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      sync_version INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
