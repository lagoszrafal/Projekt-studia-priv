import type { CryptoProvider } from './CryptoProvider';
import type { EncryptedPayload, SecretKey } from './types';

export const encryptVaultPayload = (provider: CryptoProvider, data: Uint8Array, key: SecretKey): Promise<EncryptedPayload> =>
  provider.encrypt(data, key);
export const decryptVaultPayload = (provider: CryptoProvider, data: EncryptedPayload, key: SecretKey): Promise<Uint8Array> =>
  provider.decrypt(data, key);
