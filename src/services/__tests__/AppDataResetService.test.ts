import type { SQLiteDatabase } from 'expo-sqlite';
import { AppDataResetService } from '../AppDataResetService';

describe('AppDataResetService', () => {
  it('blokuje sesję, usuwa biometrię i czyści wszystkie dane użytkownika', async () => {
    const calls: string[] = [];
    const transaction = {
      execAsync: jest.fn(async (sql: string) => { calls.push(sql); }),
    };
    const db = {
      execAsync: jest.fn(async (sql: string) => { calls.push(sql); }),
      withExclusiveTransactionAsync: jest.fn(async (operation: (value: typeof transaction) => Promise<void>) => operation(transaction)),
    } as unknown as SQLiteDatabase;
    const biometricVault = { disable: jest.fn(async () => undefined) };
    const session = { lock: jest.fn() };
    const clipboard = { clear: jest.fn(async () => undefined) };

    await new AppDataResetService(db, biometricVault, session, clipboard).reset();

    expect(session.lock).toHaveBeenCalledTimes(1);
    expect(biometricVault.disable).toHaveBeenCalledTimes(1);
    expect(clipboard.clear).toHaveBeenCalledTimes(1);
    expect(calls[0]).toBe('PRAGMA secure_delete = ON;');
    expect(calls[1]).toContain('DELETE FROM vault_entries;');
    expect(calls[1]).toContain('DELETE FROM categories;');
    expect(calls[1]).toContain('DELETE FROM settings;');
    expect(calls[1]).toContain('DELETE FROM vault_metadata;');
  });

  it('nie kasuje bazy, jeżeli nie uda się usunąć klucza biometrycznego', async () => {
    const db = {
      execAsync: jest.fn(),
      withExclusiveTransactionAsync: jest.fn(),
    } as unknown as SQLiteDatabase;
    const biometricVault = { disable: jest.fn(async () => { throw new Error('secure storage failure'); }) };
    const session = { lock: jest.fn() };
    const clipboard = { clear: jest.fn(async () => undefined) };

    await expect(new AppDataResetService(db, biometricVault, session, clipboard).reset()).rejects.toThrow('secure storage failure');

    expect(session.lock).toHaveBeenCalledTimes(1);
    expect(clipboard.clear).not.toHaveBeenCalled();
    expect(db.withExclusiveTransactionAsync).not.toHaveBeenCalled();
  });
});
