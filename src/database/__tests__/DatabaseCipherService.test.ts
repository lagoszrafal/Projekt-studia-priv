import type { SQLiteDatabase } from 'expo-sqlite';
import type { SecureStorageService } from '@/security/SecureStorageService';
import type { KdfMetadata, SecretKey } from '@/crypto/types';
import { DatabaseCipherService } from '../DatabaseCipherService';

let mockDatabaseFileSize = 0;

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true, size: mockDatabaseFileSize })),
}));

const kdf: KdfMetadata = {
  algorithm: 'argon2id',
  version: 1,
  salt: '0102030405060708090a0b0c0d0e0f10',
  memoryCost: 65_536,
  iterations: 3,
  parallelism: 1,
};

function createDb(cipherAvailable = true) {
  const calls: string[] = [];
  const db = {
    databasePath: 'file:///cache/vaultly.db',
    execAsync: jest.fn(async (sql: string) => { calls.push(sql); }),
    getFirstAsync: jest.fn(async (sql: string) => {
      calls.push(sql);
      if (sql === 'PRAGMA cipher_version') {
        return cipherAvailable ? { cipher_version: '4.7.0' } : null;
      }
      if (sql === 'PRAGMA wal_checkpoint(TRUNCATE)') return { busy: 0 };
      if (sql.includes('sqlite_master')) return { count: 0 };
      return { version: 2 };
    }),
  } as unknown as SQLiteDatabase;
  return { db, calls };
}

function createStorage(initial?: string) {
  let value = initial ?? null;
  const storage: SecureStorageService = {
    get: jest.fn(async () => value),
    set: jest.fn(async (_key, nextValue) => { value = nextValue; }),
    remove: jest.fn(async () => { value = null; }),
  };
  return { storage, read: () => value };
}

describe('DatabaseCipherService', () => {
  it('sets the stored key before checking and migrating an encrypted database', async () => {
    const state = {
      version: 1,
      status: 'ready',
      key: 'ab'.repeat(32),
      kdf,
    };
    const { storage } = createStorage(JSON.stringify(state));
    const { db, calls } = createDb();
    const service = new DatabaseCipherService(storage);

    await service.initialize(db);

    expect(calls[0]).toBe(`PRAGMA key = "x'${'ab'.repeat(32)}'";`);
    expect(service.isKeyed(db)).toBe(true);
    expect(calls).toContain('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  });

  it('encrypts a legacy database only after receiving an authenticated key', async () => {
    const { storage, read } = createStorage();
    const { db, calls } = createDb();
    const service = new DatabaseCipherService(storage);
    const key: SecretKey = { bytes: new Uint8Array(32).fill(0xab) };

    await service.encryptLegacyDatabase(db, key, kdf);

    expect(calls[0]).toBe('PRAGMA cipher_version');
    expect(calls[1]).toBe('PRAGMA wal_checkpoint(TRUNCATE)');
    expect(calls[2]).toBe(`PRAGMA rekey = "x'${'ab'.repeat(32)}'";`);
    expect(service.isKeyed(db)).toBe(true);
    expect(JSON.parse(read() ?? '{}')).toMatchObject({ status: 'ready', key: 'ab'.repeat(32), kdf });
  });

  it('sets the key before accessing schema pages on a fresh database', async () => {
    mockDatabaseFileSize = 0;
    const { storage } = createStorage();
    const { db, calls } = createDb();
    const service = new DatabaseCipherService(storage);
    const key: SecretKey = { bytes: new Uint8Array(32).fill(0xab) };

    await service.initialize(db);
    expect(service.isFreshDatabase(db)).toBe(true);
    expect(calls).toHaveLength(0);

    await service.encryptNewDatabase(db, key, kdf);

    expect(calls[0]).toBe('PRAGMA cipher_version');
    expect(calls[1]).toBe(`PRAGMA key = "x'${'ab'.repeat(32)}'";`);
    expect(calls).not.toContain(`PRAGMA rekey = "x'${'ab'.repeat(32)}'";`);
  });

  it('refuses to proceed when the native build does not expose SQLCipher', async () => {
    mockDatabaseFileSize = 0;
    const { storage } = createStorage();
    const { db } = createDb(false);
    const service = new DatabaseCipherService(storage);
    const key: SecretKey = { bytes: new Uint8Array(32).fill(0xab) };

    await service.initialize(db);
    await expect(service.encryptNewDatabase(db, key, kdf)).rejects.toThrow('SQLCipher nie jest dostępny');
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('clears an interrupted pending key when the database is still empty and SQLCipher is unavailable', async () => {
    mockDatabaseFileSize = 0;
    const pendingState = {
      version: 1,
      status: 'pending',
      key: 'ab'.repeat(32),
      kdf,
    };
    const { storage } = createStorage(JSON.stringify(pendingState));
    const { db } = createDb(false);
    const service = new DatabaseCipherService(storage);

    await service.initialize(db);

    expect(storage.remove).toHaveBeenCalledWith('vaultly.database-cipher.v1');
    expect(service.isFreshDatabase(db)).toBe(true);
  });
});
