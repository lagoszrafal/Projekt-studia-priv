import type { SQLiteDatabase } from 'expo-sqlite';
import { migration001Initial } from './migrations/001_initial';
import { migration002VaultKeyAuthenticationTag } from './migrations/002_vault_key_authentication_tag';
import { CURRENT_SCHEMA_VERSION } from './schema';

type Migration = { version: number; up: (db: SQLiteDatabase) => Promise<void> };
const migrations: Migration[] = [
  { version: 1, up: migration001Initial },
  { version: 2, up: migration002VaultKeyAuthenticationTag },
];

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await db.execAsync('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);');
  const row = await db.getFirstAsync<{ version: number }>('SELECT MAX(version) AS version FROM schema_migrations');
  const current = row?.version ?? 0;
  for (const migration of migrations.filter(({ version }) => version > current)) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await migration.up(transaction);
      await transaction.runAsync('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', migration.version, Date.now());
    });
  }
  if (current > CURRENT_SCHEMA_VERSION) throw new Error('Wersja bazy jest nowsza niż obsługiwana przez aplikację.');
}
