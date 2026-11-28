import type { CryptoProvider } from '@/crypto/CryptoProvider';
import { DEFAULT_KDF_PARAMETERS, type KdfMetadata } from '@/crypto/types';
import type { SecureRandom } from '@/crypto/Random';
import type { VaultMetadata, VaultMetadataRepository } from '@/database/repositories/VaultMetadataRepository';
import { SQLiteVaultMetadataRepository } from '@/database/repositories/SQLiteVaultMetadataRepository';
import type { VaultSession } from '@/security/VaultSession';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { DatabaseCipherService } from '@/database/DatabaseCipherService';
import { bytesToHex } from '@/utils/hex';
import { InvalidMasterPasswordError, VaultCorruptedError } from '@/utils/errors';

const VAULT_KEY_AAD = new TextEncoder().encode('vaultly:vault-key:v1');

export class AuthService {
  constructor(
    private readonly crypto: CryptoProvider,
    private readonly random: SecureRandom,
    private readonly metadataRepository: VaultMetadataRepository,
    private readonly session: VaultSession,
    private readonly db: SQLiteDatabase,
    private readonly databaseCipher: DatabaseCipherService,
  ) {}

  hasVault(): Promise<boolean> {
    if (this.databaseCipher.isFreshDatabase(this.db)) return Promise.resolve(false);
    return this.metadataRepository.exists();
  }

  async createVault(masterPassword: string): Promise<void> {
    if (
      !this.databaseCipher.isFreshDatabase(this.db) &&
      await this.metadataRepository.exists()
    ) {
      throw new Error('Sejf już istnieje.');
    }
    const saltBytes = this.random.bytes(16);
    const kdf: KdfMetadata = { ...DEFAULT_KDF_PARAMETERS, salt: bytesToHex(saltBytes) };
    saltBytes.fill(0);
    const kek = await this.crypto.deriveKey(masterPassword, kdf);
    const vaultKey = await this.crypto.generateVaultKey();
    try {
      const wrappedVaultKey = await this.crypto.encrypt(vaultKey.bytes, kek, VAULT_KEY_AAD);
      await this.databaseCipher.encryptNewDatabase(this.db, kek, kdf);
      const now = Date.now();
      await this.metadataRepository.create({ kdf, wrappedVaultKey, createdAt: now, updatedAt: now });
      await this.databaseCipher.markReady(kek, kdf);
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
    const metadata = await this.metadataRepository.get();
    if (!metadata) throw new VaultCorruptedError();

    let kek: Awaited<ReturnType<CryptoProvider['deriveKey']>> | null = null;
    try {
      kek = await this.crypto.deriveKey(masterPassword, metadata.kdf);
      let vaultKeyBytes: Uint8Array;
      try {
        vaultKeyBytes = await this.crypto.decrypt(metadata.wrappedVaultKey, kek, VAULT_KEY_AAD);
      } catch {
        throw new InvalidMasterPasswordError();
      }

      try {
        if (!this.databaseCipher.isKeyed(this.db)) {
          await this.databaseCipher.encryptLegacyDatabase(this.db, kek, metadata.kdf);
        }
        this.session.open({ bytes: vaultKeyBytes });
      } catch (error) {
        this.crypto.destroyKey({ bytes: vaultKeyBytes });
        throw error;
      }
    } catch (error) {
      this.session.lock();
      throw error;
    } finally {
      if (kek) this.crypto.destroyKey(kek);
    }
  }

  async restoreFromBackup(masterPassword: string, backupDb: SQLiteDatabase, kdf: KdfMetadata): Promise<void> {
    if (
      !this.databaseCipher.isFreshDatabase(this.db) &&
      await this.metadataRepository.exists()
    ) {
      throw new Error('Import jest dostępny tylko podczas konfiguracji pustego sejfu.');
    }

    const key = await this.crypto.deriveKey(masterPassword, kdf);
    let vaultKeyBytes: Uint8Array | null = null;
    try {
      try {
        await this.databaseCipher.openWithKey(backupDb, key);
      } catch (error) {
        if (error instanceof Error && error.message.includes('SQLCipher nie jest dostępny')) throw error;
        throw new InvalidMasterPasswordError();
      }

      let metadata: VaultMetadata | null;
      try {
        metadata = await new SQLiteVaultMetadataRepository(backupDb).get();
      } catch {
        throw new VaultCorruptedError();
      }
      if (!metadata || !metadata.kdf || !sameKdf(metadata.kdf, kdf)) throw new VaultCorruptedError();

      try {
        vaultKeyBytes = await this.crypto.decrypt(metadata.wrappedVaultKey, key, VAULT_KEY_AAD);
      } catch {
        throw new InvalidMasterPasswordError();
      }

      await this.databaseCipher.restoreDatabase(this.db, backupDb, key, kdf);
      this.session.open({ bytes: vaultKeyBytes });
      vaultKeyBytes = null;
    } finally {
      if (vaultKeyBytes) this.crypto.destroyKey({ bytes: vaultKeyBytes });
      this.crypto.destroyKey(key);
    }
  }

  lock(): void {
    this.session.lock();
  }
}

function sameKdf(left: KdfMetadata, right: KdfMetadata): boolean {
  return left.algorithm === right.algorithm
    && left.version === right.version
    && left.salt === right.salt
    && left.memoryCost === right.memoryCost
    && left.iterations === right.iterations
    && left.parallelism === right.parallelism;
}
