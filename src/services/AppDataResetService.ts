import type { SQLiteDatabase } from 'expo-sqlite';
import type { BiometricVaultService } from '@/security/BiometricVaultService';
import type { VaultSession } from '@/security/VaultSession';
import type { ClipboardService } from './ClipboardService';

export class AppDataResetService {
  constructor(
    private readonly db: SQLiteDatabase,
    private readonly biometricVault: Pick<BiometricVaultService, 'disable'>,
    private readonly session: Pick<VaultSession, 'lock'>,
    private readonly clipboard: Pick<ClipboardService, 'clear'>,
  ) {}

  async reset(): Promise<void> {
    this.session.lock();
    await this.biometricVault.disable();
    await this.clipboard.clear();
    await this.db.execAsync('PRAGMA secure_delete = ON;');
    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(`
        DELETE FROM vault_entries;
        DELETE FROM categories;
        DELETE FROM settings;
        DELETE FROM vault_metadata;
      `);
    });

    try {
      await this.db.execAsync('PRAGMA wal_checkpoint(TRUNCATE); VACUUM;');
    } catch {
      // Dane zostały już bezpiecznie usunięte w zatwierdzonej transakcji.
    }
  }
}
