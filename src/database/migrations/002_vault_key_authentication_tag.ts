import type { SQLiteDatabase } from 'expo-sqlite';

export async function migration002VaultKeyAuthenticationTag(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('ALTER TABLE vault_metadata ADD COLUMN wrap_authentication_tag TEXT;');
}
