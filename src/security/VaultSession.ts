import type { CryptoProvider } from '@/crypto/CryptoProvider';
import type { SecretKey } from '@/crypto/types';

export class VaultSession {
  private vaultKey: SecretKey | null = null;

  constructor(private readonly crypto: CryptoProvider) {}

  open(vaultKey: SecretKey): void {
    this.lock();
    this.vaultKey = vaultKey;
  }

  requireKey(): SecretKey {
    if (!this.vaultKey) throw new Error('Sejf jest zablokowany.');
    return this.vaultKey;
  }

  isOpen(): boolean {
    return this.vaultKey !== null;
  }

  lock(): void {
    if (this.vaultKey) this.crypto.destroyKey(this.vaultKey);
    this.vaultKey = null;
  }
}
