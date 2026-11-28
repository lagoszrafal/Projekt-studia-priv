import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import type { DatabaseCipherService } from '@/database/DatabaseCipherService';
import { encodeDatabaseBackup } from './DatabaseBackupFormat';

export async function exportDatabaseCopy(
  db: SQLite.SQLiteDatabase,
  databaseCipher: DatabaseCipherService,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Udostępnianie plików nie jest dostępne na tym urządzeniu.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `vaultly-backup-${timestamp}.vaultly`;
  const backup = await SQLite.openDatabaseAsync(
    `vaultly-staging-${timestamp}.db`,
    { useNewConnection: true },
    Paths.cache.uri,
  );
  const stagingFile = new File(backup.databasePath);
  const exportFile = new File(Paths.cache, fileName);
  let closed = false;
  try {
    const key = await databaseCipher.getKeyHex();
    const kdf = await databaseCipher.getKdfMetadata();
    await backup.execAsync(`PRAGMA key = "x'${key}'";`);
    const cipherVersion = await backup.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipherVersion?.cipher_version) {
      throw new Error('Nie można utworzyć zaszyfrowanej kopii bez SQLCipher.');
    }
    await backup.getFirstAsync('SELECT COUNT(*) AS count FROM sqlite_master');
    await backup.execAsync('PRAGMA journal_mode = DELETE;');
    await SQLite.backupDatabaseAsync({ sourceDatabase: db, destDatabase: backup });
    await backup.closeAsync();
    closed = true;
    const databaseBytes = await stagingFile.bytes();
    exportFile.create({ overwrite: true });
    exportFile.write(encodeDatabaseBackup(databaseBytes, kdf));
    await Sharing.shareAsync(exportFile.uri, {
      dialogTitle: 'Eksportuj przenośną kopię sejfu',
      mimeType: 'application/vnd.vaultly.backup',
      UTI: 'public.data',
    });
  } finally {
    if (!closed) await backup.closeAsync();
    if (exportFile.exists) exportFile.delete();
    if (stagingFile.exists) stagingFile.delete();
  }
}
