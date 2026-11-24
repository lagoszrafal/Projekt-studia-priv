import type { CryptoProvider } from '@/crypto/CryptoProvider';
import type { SecretKey } from '@/crypto/types';
import type { BiometricsService } from '../BiometricsService';
import { BiometricVaultService } from '../BiometricVaultService';
import type { SecureStorageService } from '../SecureStorageService';
import { VaultSession } from '../VaultSession';

class MemoryStorage implements SecureStorageService {
  readonly values = new Map<string, string>();
  authenticatedReads = 0;
  authenticatedWrites = 0;

  async get(key: string, requireAuthentication = false): Promise<string | null> {
    if (requireAuthentication) this.authenticatedReads += 1;
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, requireAuthentication = false): Promise<void> {
    if (requireAuthentication) this.authenticatedWrites += 1;
    this.values.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.values.delete(key);
  }
}

const biometrics = (available: boolean): BiometricsService => ({
  isAvailable: async () => available,
  authenticate: async () => available,
});

const crypto = {
  destroyKey: (key: SecretKey) => key.bytes.fill(0),
} as unknown as CryptoProvider;

describe('BiometricVaultService', () => {
  it('zapisuje klucz z wymaganiem uwierzytelnienia i odtwarza sesję', async () => {
    const storage = new MemoryStorage();
    const originalSession = new VaultSession(crypto);
    originalSession.open({ bytes: new Uint8Array(32).fill(7) });
    const enrollment = new BiometricVaultService(biometrics(true), storage, originalSession);

    await enrollment.enable();
    expect(storage.authenticatedWrites).toBe(1);

    originalSession.lock();
    await expect(enrollment.unlock()).resolves.toBe(true);
    expect(storage.authenticatedReads).toBe(1);
    expect(originalSession.requireKey().bytes).toEqual(new Uint8Array(32).fill(7));
  });

  it('nie włącza funkcji bez silnej biometrii', async () => {
    const session = new VaultSession(crypto);
    session.open({ bytes: new Uint8Array(32).fill(3) });
    const service = new BiometricVaultService(biometrics(false), new MemoryStorage(), session);

    await expect(service.enable()).rejects.toThrow('Uwierzytelnianie biometryczne jest niedostępne.');
  });

  it('wyłącza biometrię, gdy chroniony klucz został unieważniony', async () => {
    const storage = new MemoryStorage();
    storage.values.set('vaultly.biometric.enabled.v1', 'true');
    const session = new VaultSession(crypto);
    const service = new BiometricVaultService(biometrics(true), storage, session);

    await expect(service.unlock()).resolves.toBe(false);
    await expect(service.isEnabled()).resolves.toBe(false);
    expect(session.isOpen()).toBe(false);
  });
});
