import { Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { DatabaseCipherService } from '@/database/DatabaseCipherService';
import { exportDatabaseCopy } from '../DatabaseExportService';

const mockFileContents = new Map<string, Uint8Array>();
let mockSharedContents: Uint8Array | undefined;

jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache', name: 'cache' } },
  File: class MockFile {
    uri: string;
    name: string;

    constructor(...parts: (string | { uri: string; name?: string })[]) {
      const last = parts[parts.length - 1];
      this.name = typeof last === 'string' ? last : last?.name ?? '';
      const first = parts[0];
      const base = typeof first === 'string' ? first : first?.uri ?? '';
      this.uri = parts.length === 1 && typeof first === 'string'
        ? first
        : `${base.replace(/\/$/, '')}/${this.name}`;
    }

    get exists() { return true; }
    create() {}
    write(content: Uint8Array) { mockFileContents.set(this.uri, content); }
    async bytes() { return mockFileContents.get(this.uri) ?? new Uint8Array([1, 2, 3]); }
    delete() { mockFileContents.delete(this.uri); }
  },
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async (uri: string) => {
    mockSharedContents = mockFileContents.get(uri);
  }),
}));
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    databasePath: 'file:///cache/vaultly-staging.db',
    execAsync: jest.fn(async () => undefined),
    getFirstAsync: jest.fn(async (sql: string) => sql === 'PRAGMA cipher_version'
      ? { cipher_version: '4.7.0' }
      : { count: 0 }),
    closeAsync: jest.fn(async () => undefined),
  })),
  backupDatabaseAsync: jest.fn(async () => undefined),
}));

describe('exportDatabaseCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileContents.clear();
    mockSharedContents = undefined;
  });

  it('creates a keyed SQLCipher backup in a portable file before sharing', async () => {
    const db = {} as SQLiteDatabase;
    const cipher = {
      getKeyHex: jest.fn(async () => 'ab'.repeat(32)),
      getKdfMetadata: jest.fn(async () => ({
        algorithm: 'argon2id' as const,
        version: 1,
        salt: '0102030405060708090a0b0c0d0e0f10',
        memoryCost: 65_536,
        iterations: 3,
        parallelism: 1,
      })),
    } as unknown as DatabaseCipherService;

    await exportDatabaseCopy(db, cipher);

    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^vaultly-staging-.*\.db$/),
      { useNewConnection: true },
      Paths.cache.uri,
    );
    expect(cipher.getKeyHex).toHaveBeenCalledTimes(1);
    expect(cipher.getKdfMetadata).toHaveBeenCalledTimes(1);
    const databaseResult = jest.mocked(SQLite.openDatabaseAsync).mock.results[0];
    if (!databaseResult) throw new Error('Expected the backup database to be opened.');
    const backup = await databaseResult.value;
    expect(backup.execAsync).toHaveBeenNthCalledWith(1, `PRAGMA key = "x'${'ab'.repeat(32)}'";`);
    expect(backup.getFirstAsync).toHaveBeenCalledWith('PRAGMA cipher_version');
    expect(SQLite.backupDatabaseAsync).toHaveBeenCalledWith({ sourceDatabase: db, destDatabase: backup });
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^file:\/\/\/cache\/vaultly-backup-.*\.vaultly$/),
      expect.objectContaining({ mimeType: 'application/vnd.vaultly.backup' }),
    );
    expect(mockSharedContents?.slice(0, 7)).toEqual(
      new TextEncoder().encode('VAULTLY').slice(0, 7),
    );
    expect(backup.closeAsync).toHaveBeenCalledTimes(1);
  });

  it('fails before opening a backup when sharing is unavailable', async () => {
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValue(false);
    const db = {} as SQLiteDatabase;
    const cipher = { getKeyHex: jest.fn() } as unknown as DatabaseCipherService;

    await expect(exportDatabaseCopy(db, cipher)).rejects.toThrow('Udostępnianie plików nie jest dostępne');

    expect(SQLite.openDatabaseAsync).not.toHaveBeenCalled();
  });
});
