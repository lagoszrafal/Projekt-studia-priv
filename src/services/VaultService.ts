import { randomUUID } from 'expo-crypto';
import type { CryptoProvider } from '@/crypto/CryptoProvider';
import type { EncryptedVaultRecord, VaultRepository } from '@/database/repositories/VaultRepository';
import type { VaultSession } from '@/security/VaultSession';
import type { VaultEntry } from '@/types/VaultEntry';
import { VaultCorruptedError } from '@/utils/errors';
import { deserializeVaultEntry, serializeVaultEntry } from './VaultEntrySerializer';

export type NewLoginEntry = Pick<VaultEntry, 'name' | 'username' | 'password' | 'favorite'> &
  Partial<Pick<VaultEntry, 'url' | 'notes' | 'categoryId'>>;

const entryAad = (id: string) => new TextEncoder().encode(`vaultly:entry:${id}:login:v1`);

export class VaultService {
  constructor(
    private readonly repository: VaultRepository,
    private readonly crypto: CryptoProvider,
    private readonly session: VaultSession,
  ) {}

  async getAll(): Promise<VaultEntry[]> {
    const records = await this.repository.getAll();
    return Promise.all(records.map((record) => this.decryptRecord(record)));
  }

  async getById(id: string): Promise<VaultEntry | null> {
    const record = await this.repository.getById(id);
    return record ? this.decryptRecord(record) : null;
  }

  async create(input: NewLoginEntry): Promise<VaultEntry> {
    const now = Date.now();
    const entry: VaultEntry = { id: randomUUID(), type: 'login', ...input, createdAt: now, updatedAt: now };
    const payload = await this.crypto.encrypt(
      serializeVaultEntry(entry),
      this.session.requireKey(),
      entryAad(entry.id),
    );
    await this.repository.insert({
      id: entry.id, type: 'login', ...payload, createdAt: now, updatedAt: now,
      deletedAt: null, syncVersion: 1,
    });
    return entry;
  }

  async update(entry: VaultEntry): Promise<VaultEntry> {
    const current = await this.repository.getById(entry.id);
    if (!current) throw new Error('Nie znaleziono wpisu.');
    const updated = { ...entry, createdAt: current.createdAt, updatedAt: Date.now() };
    const payload = await this.crypto.encrypt(
      serializeVaultEntry(updated),
      this.session.requireKey(),
      entryAad(entry.id),
    );
    await this.repository.update({
      ...current, ...payload, updatedAt: updated.updatedAt, syncVersion: current.syncVersion + 1,
    });
    return updated;
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  private async decryptRecord(record: EncryptedVaultRecord): Promise<VaultEntry> {
    try {
      const bytes = await this.crypto.decrypt(
        record,
        this.session.requireKey(),
        entryAad(record.id),
      );
      const entry = deserializeVaultEntry(bytes);
      if (entry.id !== record.id || entry.type !== record.type) throw new VaultCorruptedError();
      return entry;
    } catch (error) {
      if (error instanceof VaultCorruptedError) throw error;
      throw new VaultCorruptedError();
    }
  }
}
