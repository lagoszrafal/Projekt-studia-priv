import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import type { KdfMetadata, SecretKey } from '@/crypto/types';
import { bytesToHex } from '@/utils/hex';
import type { SecureStorageService } from '@/security/SecureStorageService';
import { migrateDatabase } from './database';

const DATABASE_CIPHER_STATE_KEY = 'vaultly.database-cipher.v1';

type DatabaseCipherState = {
  version: 1;
  status: 'pending' | 'migrating' | 'ready';
  key: string;
  kdf: KdfMetadata;
};

export class DatabaseCipherService {
  private readonly keyedDatabases = new WeakSet<SQLiteDatabase>();
  private readonly freshDatabases = new WeakSet<SQLiteDatabase>();

  constructor(private readonly storage: SecureStorageService) {}

  async initialize(db: SQLiteDatabase): Promise<void> {
    this.assertSupportedPlatform();
    const state = await this.getState();
    if (state?.status === 'ready') {
      await this.applyKey(db, state.key);
      await this.verifyKey(db);
      this.keyedDatabases.add(db);
      await migrateDatabase(db);
      return;
    }

    if (await this.isDatabaseFileEmpty(db)) {
      if (state) {
        if (!(await this.hasSQLCipher(db))) {
          await this.storage.remove(DATABASE_CIPHER_STATE_KEY);
          this.freshDatabases.add(db);
          return;
        }
        await this.applyKey(db, state.key);
        await this.verifyKey(db);
        this.keyedDatabases.add(db);
        await migrateDatabase(db);
        await this.storeState({ ...state, status: 'ready' });
      } else {
        this.freshDatabases.add(db);
      }
    }
  }

  isFreshDatabase(db: SQLiteDatabase): boolean {
    return this.freshDatabases.has(db);
  }

  private async isDatabaseFileEmpty(db: SQLiteDatabase): Promise<boolean> {
    const info = new File(db.databasePath).info();
    if (!info.exists) return true;
    if (typeof info.size !== 'number') {
      throw new Error('Nie można ustalić stanu lokalnej bazy danych.');
    }
    return info.size === 0;
  }

  async getState(): Promise<DatabaseCipherState | null> {
    const value = await this.storage.get(DATABASE_CIPHER_STATE_KEY);
    if (!value) return null;

    try {
      const state = JSON.parse(value) as DatabaseCipherState;
      if (
        state.version !== 1 ||
        !['pending', 'migrating', 'ready'].includes(state.status) ||
        !/^[0-9a-f]{64}$/i.test(state.key) ||
        state.kdf.algorithm !== 'argon2id' ||
        state.kdf.version !== 1 ||
        !/^(?:[0-9a-f]{2})+$/i.test(state.kdf.salt) ||
        state.kdf.memoryCost <= 0 ||
        state.kdf.iterations <= 0 ||
        state.kdf.parallelism <= 0
      ) {
        throw new Error('Nieprawidłowe metadane klucza bazy.');
      }
      return state;
    } catch (error) {
      throw new Error(
        error instanceof Error ? `Nie można odczytać klucza bazy: ${error.message}` : 'Nie można odczytać klucza bazy.',
      );
    }
  }

  isKeyed(db: SQLiteDatabase): boolean {
    return this.keyedDatabases.has(db);
  }

  async activateStoredKey(db: SQLiteDatabase): Promise<void> {
    const state = await this.getState();
    if (!state) throw new Error('Brak klucza do zaszyfrowanej bazy.');

    await this.applyKey(db, state.key);
    await this.verifyKey(db);
    this.keyedDatabases.add(db);
    await migrateDatabase(db);
    if (state.status !== 'ready') {
      await this.storeState({ ...state, status: 'ready' });
    }
  }

  async encryptNewDatabase(db: SQLiteDatabase, key: SecretKey, kdf: KdfMetadata): Promise<void> {
    this.assertSupportedPlatform();
    const nextState: DatabaseCipherState = {
      version: 1,
      status: 'pending',
      key: bytesToHex(key.bytes),
      kdf,
    };
    const canRekey = this.keyedDatabases.has(db);
    const isFresh = this.freshDatabases.has(db);
    if (!canRekey && !isFresh) {
      throw new Error('Nie można zaszyfrować istniejącej bazy bez jej wcześniejszej migracji.');
    }
    if (!(await this.hasSQLCipher(db))) {
      throw new Error('SQLCipher nie jest dostępny. Przebuduj aplikację z obsługą SQLCipher.');
    }
    await this.storeState(nextState);
    if (canRekey) {
      await this.rekey(db, nextState.key);
    } else {
      await this.applyKey(db, nextState.key);
      this.freshDatabases.delete(db);
    }
    await this.verifyKey(db);
    this.keyedDatabases.add(db);
    await migrateDatabase(db);
  }

  async openWithKey(db: SQLiteDatabase, key: SecretKey): Promise<void> {
    this.assertSupportedPlatform();
    await this.applyKey(db, bytesToHex(key.bytes));
    await this.verifyKey(db);
    this.keyedDatabases.add(db);
  }

  async restoreDatabase(
    db: SQLiteDatabase,
    backup: SQLiteDatabase,
    key: SecretKey,
    kdf: KdfMetadata,
  ): Promise<void> {
    this.assertSupportedPlatform();
    const state: DatabaseCipherState = {
      version: 1,
      status: 'pending',
      key: bytesToHex(key.bytes),
      kdf,
    };
    const canRekey = this.keyedDatabases.has(db);
    const isFresh = this.freshDatabases.has(db);
    if (!canRekey && !isFresh) {
      throw new Error('Nie można zaszyfrować istniejącej bazy bez jej wcześniejszej migracji.');
    }
    if (!(await this.hasSQLCipher(db))) {
      throw new Error('SQLCipher nie jest dostępny. Przebuduj aplikację z obsługą SQLCipher.');
    }
    await this.storeState(state);
    if (canRekey) {
      await this.rekey(db, state.key);
    } else {
      await this.applyKey(db, state.key);
      this.freshDatabases.delete(db);
    }
    await this.verifyKey(db);
    this.keyedDatabases.add(db);
    await db.execAsync('PRAGMA journal_mode = DELETE;');
    await SQLite.backupDatabaseAsync({ sourceDatabase: backup, destDatabase: db });
    await this.verifyKey(db);
    await migrateDatabase(db);
    await this.storeState({ ...state, status: 'ready' });
  }

  async encryptLegacyDatabase(db: SQLiteDatabase, key: SecretKey, kdf: KdfMetadata): Promise<void> {
    this.assertSupportedPlatform();
    if (!(await this.hasSQLCipher(db))) {
      throw new Error('SQLCipher nie jest dostępny. Przebuduj aplikację z obsługą SQLCipher.');
    }
    const state: DatabaseCipherState = {
      version: 1,
      status: 'migrating',
      key: bytesToHex(key.bytes),
      kdf,
    };
    await this.storeState(state);
    await this.rekey(db, state.key);
    await this.verifyKey(db);
    this.keyedDatabases.add(db);
    await migrateDatabase(db);
    await this.storeState({ ...state, status: 'ready' });
  }

  async markReady(key: SecretKey, kdf: KdfMetadata): Promise<void> {
    await this.storeState({
      version: 1,
      status: 'ready',
      key: bytesToHex(key.bytes),
      kdf,
    });
  }

  async getKeyHex(): Promise<string> {
    const state = await this.getState();
    if (!state || state.status !== 'ready') {
      throw new Error('Baza danych nie jest gotowa do eksportu.');
    }
    return state.key;
  }

  async getKdfMetadata(): Promise<KdfMetadata> {
    const state = await this.getState();
    if (!state || state.status !== 'ready') {
      throw new Error('Baza danych nie jest gotowa do eksportu.');
    }
    return { ...state.kdf };
  }

  private applyKey(db: SQLiteDatabase, key: string): Promise<void> {
    return db.execAsync(`PRAGMA key = "x'${key}'";`);
  }

  private rekey(db: SQLiteDatabase, key: string): Promise<void> {
    return this.checkpointBeforeRekey(db).then(() => db.execAsync(`PRAGMA rekey = "x'${key}'";`));
  }

  private async checkpointBeforeRekey(db: SQLiteDatabase): Promise<void> {
    const checkpoint = await db.getFirstAsync<{ busy: number }>('PRAGMA wal_checkpoint(TRUNCATE)');
    if (!checkpoint || checkpoint.busy !== 0) {
      throw new Error('Nie można bezpiecznie zaszyfrować bazy: checkpoint WAL jest zajęty.');
    }
  }

  private async verifyKey(db: SQLiteDatabase): Promise<void> {
    if (!(await this.hasSQLCipher(db))) {
      throw new Error('SQLCipher nie jest dostępny. Przebuduj aplikację z obsługą SQLCipher.');
    }
    await db.getFirstAsync('SELECT COUNT(*) AS count FROM sqlite_master');
  }

  private async hasSQLCipher(db: SQLiteDatabase): Promise<boolean> {
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    return Boolean(cipher?.cipher_version);
  }

  private storeState(state: DatabaseCipherState): Promise<void> {
    return this.storage.set(DATABASE_CIPHER_STATE_KEY, JSON.stringify(state));
  }

  private assertSupportedPlatform(): void {
    if (Platform.OS === 'web') {
      throw new Error('Szyfrowanie SQLCipher jest dostępne tylko w natywnych wersjach iOS i Android.');
    }
  }
}
