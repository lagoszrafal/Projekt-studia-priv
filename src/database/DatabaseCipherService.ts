import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
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

  constructor(private readonly storage: SecureStorageService) {}

  async initialize(db: SQLiteDatabase): Promise<void> {
    this.assertSupportedPlatform();
    const state = await this.getState();
    if (!state || state.status !== 'ready') return;

    await this.applyKey(db, state.key);
    await this.verifyKey(db);
    this.keyedDatabases.add(db);
    await migrateDatabase(db);
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
    await this.storeState(nextState);
    await this.rekey(db, nextState.key);
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
    await this.storeState(state);
    await this.rekey(db, state.key);
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
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) {
      throw new Error('SQLCipher nie jest dostępny. Przebuduj aplikację z obsługą SQLCipher.');
    }
    await db.getFirstAsync('SELECT COUNT(*) AS count FROM sqlite_master');
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
