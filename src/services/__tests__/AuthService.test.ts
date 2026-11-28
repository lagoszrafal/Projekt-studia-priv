import type { CryptoProvider } from '@/crypto/CryptoProvider';
import type { EncryptedPayload, KdfMetadata, SecretKey } from '@/crypto/types';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SecureRandom } from '@/crypto/Random';
import type { DatabaseCipherService } from '@/database/DatabaseCipherService';
import type { VaultMetadata, VaultMetadataRepository } from '@/database/repositories/VaultMetadataRepository';
import { SQLiteVaultMetadataRepository } from '@/database/repositories/SQLiteVaultMetadataRepository';
import { VaultSession } from '@/security/VaultSession';
import { AuthService } from '../AuthService';

class MemoryMetadataRepository implements VaultMetadataRepository {
  value: VaultMetadata | null = null;
  async exists() { return this.value !== null; }
  async get() { return this.value; }
  async create(metadata: VaultMetadata) { this.value = metadata; }
}

class FixedRandom implements SecureRandom {
  bytes(length: number) { return new Uint8Array(length).fill(9); }
}

class FakeDatabaseCipher {
  state: { status: 'pending' | 'migrating' | 'ready' } | null = null;
  keyed = false;
  legacyEncryptions = 0;
  restorations = 0;
  async encryptNewDatabase() { this.keyed = true; this.state = { status: 'pending' }; }
  async encryptLegacyDatabase() { this.legacyEncryptions += 1; this.keyed = true; this.state = { status: 'ready' }; }
  async markReady() { this.state = { status: 'ready' }; }
  async openWithKey(_db: SQLiteDatabase, key: SecretKey) {
    if (!key.bytes[0]) throw new Error('Nieprawidłowy klucz.');
  }
  async restoreDatabase() { this.restorations += 1; }
  async getState() { return this.state; }
  isKeyed() { return this.keyed; }
}

class FakeCrypto implements CryptoProvider {
  async deriveKey(password: string, _metadata: KdfMetadata): Promise<SecretKey> {
    const marker = password === 'test-only-passphrase' ? 1 : password === 'replacement-passphrase' ? 2 : 0;
    return { bytes: new Uint8Array([marker]) };
  }
  async generateVaultKey(): Promise<SecretKey> { return { bytes: new Uint8Array([7, 8, 9]) }; }
  async encrypt(_plaintext: Uint8Array, key: SecretKey): Promise<EncryptedPayload> {
    if (!key.bytes[0]) throw new Error('bad key');
    return { ciphertext: `wrapped-by-${key.bytes[0]}`, nonce: 'test-nonce', authenticationTag: 'test-tag', cryptoVersion: 1 };
  }
  async decrypt(payload: EncryptedPayload, key: SecretKey): Promise<Uint8Array> {
    if (payload.ciphertext !== `wrapped-by-${key.bytes[0]}`) throw new Error('bad key');
    return new Uint8Array([7, 8, 9]);
  }
  destroyKey(key: SecretKey) { key.bytes.fill(0); }
}

describe('AuthService', () => {
  it('tworzy metadane, otwiera sesję i nie zapisuje hasła', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const databaseCipher = new FakeDatabaseCipher();
    const service = new AuthService(
      crypto,
      new FixedRandom(),
      repository,
      session,
      {} as SQLiteDatabase,
      databaseCipher as unknown as DatabaseCipherService,
    );

    await service.createVault('test-only-passphrase');

    expect(session.isOpen()).toBe(true);
    expect(repository.value?.kdf.algorithm).toBe('argon2id');
    expect(JSON.stringify(repository.value)).not.toContain('test-only-passphrase');
    expect(databaseCipher.keyed).toBe(true);
    expect(databaseCipher.state?.status).toBe('ready');
  });

  it('odblokowuje prawidłowym hasłem i odrzuca błędne', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const databaseCipher = new FakeDatabaseCipher();
    const service = new AuthService(
      crypto,
      new FixedRandom(),
      repository,
      session,
      {} as SQLiteDatabase,
      databaseCipher as unknown as DatabaseCipherService,
    );
    await service.createVault('test-only-passphrase');
    service.lock();
    databaseCipher.keyed = false;
    databaseCipher.state = null;

    await expect(service.unlock('invalid-test-value')).rejects.toThrow('Nie udało się odblokować');
    expect(session.isOpen()).toBe(false);
    expect(databaseCipher.legacyEncryptions).toBe(0);
    await service.unlock('test-only-passphrase');
    expect(session.requireKey().bytes).toEqual(new Uint8Array([7, 8, 9]));
    expect(databaseCipher.legacyEncryptions).toBe(1);
  });

  it('zamyka poprzednią sesję, gdy ponowne odblokowanie się nie powiedzie', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const service = new AuthService(
      crypto,
      new FixedRandom(),
      repository,
      session,
      {} as SQLiteDatabase,
      new FakeDatabaseCipher() as unknown as DatabaseCipherService,
    );

    await service.createVault('test-only-passphrase');
    await expect(service.unlock('invalid-test-value')).rejects.toThrow('Nie udało się odblokować');

    expect(session.isOpen()).toBe(false);
  });

  it('does not replace the local database when the backup password is invalid', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const databaseCipher = new FakeDatabaseCipher();
    const service = new AuthService(
      crypto,
      new FixedRandom(),
      repository,
      session,
      {} as SQLiteDatabase,
      databaseCipher as unknown as DatabaseCipherService,
    );

    await expect(service.restoreFromBackup('invalid-test-value', {} as SQLiteDatabase, {
      algorithm: 'argon2id',
      version: 1,
      salt: '0102030405060708090a0b0c0d0e0f10',
      memoryCost: 65_536,
      iterations: 3,
      parallelism: 1,
    })).rejects.toThrow('Nie udało się odblokować');

    expect(databaseCipher.restorations).toBe(0);
    expect(session.isOpen()).toBe(false);
  });

  it('restores a verified backup and opens its vault session', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const databaseCipher = new FakeDatabaseCipher();
    const service = new AuthService(
      crypto,
      new FixedRandom(),
      repository,
      session,
      {} as SQLiteDatabase,
      databaseCipher as unknown as DatabaseCipherService,
    );
    const kdf: KdfMetadata = {
      algorithm: 'argon2id',
      version: 1,
      salt: '0102030405060708090a0b0c0d0e0f10',
      memoryCost: 65_536,
      iterations: 3,
      parallelism: 1,
    };
    const readBackupMetadata = jest.spyOn(SQLiteVaultMetadataRepository.prototype, 'get').mockResolvedValue({
      kdf,
      wrappedVaultKey: {
        ciphertext: 'wrapped-by-1',
        nonce: 'test-nonce',
        authenticationTag: 'test-tag',
        cryptoVersion: 1,
      },
      createdAt: 1,
      updatedAt: 1,
    });

    try {
      await service.restoreFromBackup('test-only-passphrase', {} as SQLiteDatabase, kdf);

      expect(databaseCipher.restorations).toBe(1);
      expect(session.isOpen()).toBe(true);
    } finally {
      readBackupMetadata.mockRestore();
    }
  });

});
