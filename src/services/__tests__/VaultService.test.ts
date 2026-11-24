import type { CryptoProvider } from '@/crypto/CryptoProvider';
import type { EncryptedPayload, KdfMetadata, SecretKey } from '@/crypto/types';
import type { EncryptedVaultRecord, VaultRepository } from '@/database/repositories/VaultRepository';
import { VaultSession } from '@/security/VaultSession';
import { bytesToHex, hexToBytes } from '@/utils/hex';
import { VaultService } from '../VaultService';

jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));

class MemoryVaultRepository implements VaultRepository {
  records: EncryptedVaultRecord[] = [];

  async getAll() { return [...this.records]; }
  async getById(id: string) { return this.records.find((record) => record.id === id) ?? null; }
  async insert(record: EncryptedVaultRecord) { this.records.push(record); }
  async update(record: EncryptedVaultRecord) {
    this.records = this.records.map((current) => current.id === record.id ? record : current);
  }
  async delete(id: string) {
    this.records = this.records.filter((record) => record.id !== id);
  }
}

class ReversibleTestCrypto implements CryptoProvider {
  async deriveKey(_password: string, _metadata: KdfMetadata): Promise<SecretKey> { return { bytes: new Uint8Array(32) }; }
  async generateVaultKey(): Promise<SecretKey> { return { bytes: new Uint8Array(32) }; }
  async encrypt(plaintext: Uint8Array): Promise<EncryptedPayload> {
    return { ciphertext: bytesToHex(plaintext), nonce: 'test', authenticationTag: 'test', cryptoVersion: 1 };
  }
  async decrypt(payload: EncryptedPayload): Promise<Uint8Array> { return hexToBytes(payload.ciphertext); }
  destroyKey(key: SecretKey) { key.bytes.fill(0); }
}

describe('VaultService', () => {
  it('odczytuje zapisany wpis po utworzeniu nowej instancji serwisu', async () => {
    const repository = new MemoryVaultRepository();
    const crypto = new ReversibleTestCrypto();
    const session = new VaultSession(crypto);
    session.open({ bytes: new Uint8Array(32).fill(7) });
    const created = await new VaultService(repository, crypto, session).create({
      name: 'Przykład',
      username: 'użytkownik',
      password: 'testowe-hasło',
      favorite: false,
    });

    const entriesAfterRelogin = await new VaultService(repository, crypto, session).getAll();

    expect(entriesAfterRelogin).toEqual([created]);
    expect(repository.records).toHaveLength(1);
  });

  it('zapisuje edycję wpisu i odczytuje ją z repozytorium', async () => {
    const repository = new MemoryVaultRepository();
    const crypto = new ReversibleTestCrypto();
    const session = new VaultSession(crypto);
    session.open({ bytes: new Uint8Array(32).fill(7) });
    const service = new VaultService(repository, crypto, session);
    const created = await service.create({
      name: 'Przykład',
      username: 'użytkownik',
      password: 'pierwsze-hasło',
      favorite: false,
    });

    const updated = await service.update({
      ...created,
      name: 'Zmieniony wpis',
      username: 'nowy-użytkownik',
      password: 'nowe-hasło',
      url: 'https://example.com',
      notes: 'Nowa notatka',
      favorite: true,
    });
    const loaded = await new VaultService(repository, crypto, session).getById(created.id);

    expect(loaded).toEqual(updated);
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]!.syncVersion).toBe(2);
  });
});
