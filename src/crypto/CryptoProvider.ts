import type { EncryptedPayload, KdfMetadata, SecretKey } from './types';

export interface CryptoProvider {
  deriveKey(masterPassword: string, metadata: KdfMetadata): Promise<SecretKey>;
  generateVaultKey(): Promise<SecretKey>;
  encrypt(plaintext: Uint8Array, key: SecretKey, associatedData?: Uint8Array): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload, key: SecretKey, associatedData?: Uint8Array): Promise<Uint8Array>;
  destroyKey(key: SecretKey): void;
}

export class CryptoNotImplementedError extends Error {
  constructor() {
    super('Dostawca Argon2id i szyfrowania sejfu nie został jeszcze bezpiecznie zintegrowany.');
    this.name = 'CryptoNotImplementedError';
  }
}

/** Bezpieczny placeholder: każda operacja jawnie odmawia działania. */
export class UnavailableCryptoProvider implements CryptoProvider {
  async deriveKey(): Promise<never> { throw new CryptoNotImplementedError(); }
  async generateVaultKey(): Promise<never> { throw new CryptoNotImplementedError(); }
  async encrypt(): Promise<never> { throw new CryptoNotImplementedError(); }
  async decrypt(): Promise<never> { throw new CryptoNotImplementedError(); }
  destroyKey(): void { /* Brak materiału kluczowego w tej implementacji. */ }
}
