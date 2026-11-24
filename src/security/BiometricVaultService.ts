import type { VaultSession } from './VaultSession';
import type { BiometricsService } from './BiometricsService';
import type { SecureStorageService } from './SecureStorageService';
import { bytesToHex, hexToBytes } from '@/utils/hex';
import { BiometricUnavailableError, VaultCorruptedError } from '@/utils/errors';

const BIOMETRIC_ENABLED_KEY = 'vaultly.biometric.enabled.v1';
const BIOMETRIC_VAULT_KEY = 'vaultly.biometric.vault-key.v1';
const VAULT_KEY_BYTES = 32;

export class BiometricVaultService {
  constructor(
    private readonly biometrics: BiometricsService,
    private readonly storage: SecureStorageService,
    private readonly session: VaultSession,
  ) {}

  async isEnabled(): Promise<boolean> {
    return (await this.storage.get(BIOMETRIC_ENABLED_KEY)) === 'true';
  }

  async enable(): Promise<void> {
    if (!(await this.biometrics.isAvailable())) throw new BiometricUnavailableError();

    const encodedVaultKey = bytesToHex(this.session.requireKey().bytes);
    try {
      await this.storage.set(BIOMETRIC_VAULT_KEY, encodedVaultKey, true);
      await this.storage.set(BIOMETRIC_ENABLED_KEY, 'true');
    } catch (error) {
      await this.disable();
      throw error;
    }
  }

  async unlock(): Promise<boolean> {
    this.session.lock();
    if (!(await this.isEnabled())) return false;

    try {
      const encodedVaultKey = await this.storage.get(BIOMETRIC_VAULT_KEY, true);
      if (!encodedVaultKey) {
        await this.disable();
        return false;
      }

      let vaultKeyBytes: Uint8Array;
      try {
        vaultKeyBytes = hexToBytes(encodedVaultKey);
      } catch {
        await this.disable();
        throw new VaultCorruptedError();
      }
      if (vaultKeyBytes.length !== VAULT_KEY_BYTES) {
        vaultKeyBytes.fill(0);
        await this.disable();
        throw new VaultCorruptedError();
      }

      this.session.open({ bytes: vaultKeyBytes });
      return true;
    } catch (error) {
      this.session.lock();
      throw error;
    }
  }

  async disable(): Promise<void> {
    await Promise.all([
      this.storage.remove(BIOMETRIC_VAULT_KEY),
      this.storage.remove(BIOMETRIC_ENABLED_KEY),
    ]);
  }
}
