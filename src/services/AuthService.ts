import type { CryptoProvider } from '@/crypto/CryptoProvider';
import { DEFAULT_KDF_PARAMETERS, type KdfMetadata } from '@/crypto/types';
import type { SecureRandom } from '@/crypto/Random';
import type { VaultMetadataRepository } from '@/database/repositories/VaultMetadataRepository';
import type { VaultSession } from '@/security/VaultSession';
import { bytesToHex } from '@/utils/hex';
import { InvalidMasterPasswordError, VaultCorruptedError } from '@/utils/errors';

const VAULT_KEY_AAD = new TextEncoder().encode('vaultly:vault-key:v1');

export class AuthService {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly random: SecureRandom,
    private readonly metadataRepository: VaultMetadataRepository,
    private readonly session: VaultSession,
  ) {}

  hasVault(): Promise<boolean> {
    return this.metadataRepository.exists();
  }

  async createVault(masterPassword: string): Promise<void> {
    if (await this.metadataRepository.exists()) throw new Error('Sejf już istnieje.');
    const saltBytes = this.random.bytes(16);
    const kdf: KdfMetadata = { ...DEFAULT_KDF_PARAMETERS, salt: bytesToHex(saltBytes) };
    saltBytes.fill(0);
    const kek = await this.crypto.deriveKey(masterPassword, kdf);
    const vaultKey = await this.crypto.generateVaultKey();
    try {
      const wrappedVaultKey = await this.crypto.encrypt(vaultKey.bytes, kek, VAULT_KEY_AAD);
      const now = Date.now();
      await this.metadataRepository.create({ kdf, wrappedVaultKey, createdAt: now, updatedAt: now });
      this.session.open(vaultKey);
    } catch (error) {
      this.crypto.destroyKey(vaultKey);
      throw error;
    } finally {
      this.crypto.destroyKey(kek);
    }
  }

  async unlock(masterPassword: string): Promise<void> {
    // An unlock attempt must never reuse key material left by an older session.
    this.session.lock();
    let kek: Awaited<ReturnType<CryptoProvider['deriveKey']>> | null = null;
    try {
      const metadata = await this.metadataRepository.get();
      if (!metadata) throw new VaultCorruptedError();
      kek = await this.crypto.deriveKey(masterPassword, metadata.kdf);
      const vaultKeyBytes = await this.crypto.decrypt(metadata.wrappedVaultKey, kek, VAULT_KEY_AAD);
      this.session.open({ bytes: vaultKeyBytes });
    } catch (error) {
      this.session.lock();
      if (error instanceof VaultCorruptedError) throw error;
      throw new InvalidMasterPasswordError();
    } finally {
      if (kek) this.crypto.destroyKey(kek);
    }
  }

  lock(): void {
    this.session.lock();
  }
}
