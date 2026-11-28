import { File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { AuthService } from './AuthService';
import { decodeDatabaseBackup, MAX_BACKUP_BYTES } from './DatabaseBackupFormat';

export async function importDatabaseCopy(
  fileUri: string,
  masterPassword: string,
  authService: AuthService,
): Promise<void> {
  const file = new File(fileUri);
  const fileInfo = file.info();
  if (!fileInfo.exists || typeof fileInfo.size !== 'number' || fileInfo.size > MAX_BACKUP_BYTES) {
    throw new Error('Nie można odczytać kopii lub jej rozmiar przekracza limit.');
  }

  const { database, kdf } = decodeDatabaseBackup(await file.bytes());
  const timestamp = Date.now();
  const stagingFile = new File(Paths.cache, `vaultly-restore-${timestamp}.db`);
  stagingFile.create({ overwrite: true });
  stagingFile.write(database);

  let backupDb: SQLiteDatabase | null = null;
  try {
    backupDb = await SQLite.openDatabaseAsync(
      stagingFile.name,
      { useNewConnection: true },
      Paths.cache.uri,
    );
    await authService.restoreFromBackup(masterPassword, backupDb, kdf);
  } finally {
    try {
      if (backupDb) await backupDb.closeAsync();
    } finally {
      if (stagingFile.exists) stagingFile.delete();
    }
  }
}
