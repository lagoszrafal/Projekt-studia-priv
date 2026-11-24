import type { CryptoProvider } from '@/crypto/CryptoProvider';
import type { EncryptedPayload, KdfMetadata, SecretKey } from '@/crypto/types';
import type { SecureRandom } from '@/crypto/Random';
import type { VaultMetadata, VaultMetadataRepository } from '@/database/repositories/VaultMetadataRepository';
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
    const service = new AuthService(crypto, new FixedRandom(), repository, session);

    await service.createVault('test-only-passphrase');

    expect(session.isOpen()).toBe(true);
    expect(repository.value?.kdf.algorithm).toBe('argon2id');
    expect(JSON.stringify(repository.value)).not.toContain('test-only-passphrase');
  });

  it('odblokowuje prawidłowym hasłem i odrzuca błędne', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const service = new AuthService(crypto, new FixedRandom(), repository, session);
    await service.createVault('test-only-passphrase');
    service.lock();

    await expect(service.unlock('invalid-test-value')).rejects.toThrow('Nie udało się odblokować');
    expect(session.isOpen()).toBe(false);
    await service.unlock('test-only-passphrase');
    expect(session.requireKey().bytes).toEqual(new Uint8Array([7, 8, 9]));
  });

  it('zamyka poprzednią sesję, gdy ponowne odblokowanie się nie powiedzie', async () => {
    const crypto = new FakeCrypto();
    const repository = new MemoryMetadataRepository();
    const session = new VaultSession(crypto);
    const service = new AuthService(crypto, new FixedRandom(), repository, session);

    await service.createVault('test-only-passphrase');
    await expect(service.unlock('invalid-test-value')).rejects.toThrow('Nie udało się odblokować');

    expect(session.isOpen()).toBe(false);
  });

});
