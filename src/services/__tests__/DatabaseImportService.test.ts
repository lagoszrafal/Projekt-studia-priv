import { DEFAULT_KDF_PARAMETERS, type KdfMetadata } from '@/crypto/types';
import * as SQLite from 'expo-sqlite';
import type { AuthService } from '../AuthService';
import { encodeDatabaseBackup, MAX_BACKUP_BYTES } from '../DatabaseBackupFormat';
import { importDatabaseCopy } from '../DatabaseImportService';

const mockFiles = new Map<string, Uint8Array>();
let mockInputBytes: Uint8Array<ArrayBufferLike> = new Uint8Array();
let mockFileSize = 0;
const mockBackupDatabase = {
  closeAsync: jest.fn(async () => undefined),
};

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

    info() { return { exists: true, size: mockFileSize }; }
    async bytes() { return mockInputBytes; }
    create() {}
    write(content: Uint8Array) { mockFiles.set(this.uri, content); }
    get exists() { return mockFiles.has(this.uri); }
    delete() { mockFiles.delete(this.uri); }
  },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => mockBackupDatabase),
}));

const kdf: KdfMetadata = {
  ...DEFAULT_KDF_PARAMETERS,
  salt: '0102030405060708090a0b0c0d0e0f10',
};

describe('importDatabaseCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFiles.clear();
    mockInputBytes = encodeDatabaseBackup(new Uint8Array([1, 2, 3]), kdf);
    mockFileSize = mockInputBytes.length;
  });

  it('opens the packaged database and restores it using the provided password', async () => {
    const authService = { restoreFromBackup: jest.fn(async () => undefined) };

    await importDatabaseCopy(
      'content://picked/vaultly.vaultly',
      'correct-password',
      authService as unknown as AuthService,
    );

    expect(SQLite.openDatabaseAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^vaultly-restore-\d+\.db$/),
      { useNewConnection: true },
      'file:///cache',
    );
    expect(authService.restoreFromBackup).toHaveBeenCalledWith(
      'correct-password',
      mockBackupDatabase,
      kdf,
    );
    expect(mockBackupDatabase.closeAsync).toHaveBeenCalledTimes(1);
    expect(mockFiles.size).toBe(0);
  });

  it('rejects a file that exceeds the import limit before opening SQLite', async () => {
    mockFileSize = MAX_BACKUP_BYTES + 1;
    const authService = { restoreFromBackup: jest.fn() };

    await expect(importDatabaseCopy(
      'content://picked/too-large.vaultly',
      'password',
      authService as unknown as AuthService,
    ))
      .rejects.toThrow('Nie można odczytać kopii');

    expect(SQLite.openDatabaseAsync).not.toHaveBeenCalled();
  });
});
