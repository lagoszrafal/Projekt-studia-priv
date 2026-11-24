import type { CryptoProvider } from './CryptoProvider';
import type { KdfMetadata, SecretKey } from './types';

export function deriveKey(provider: CryptoProvider, password: string, metadata: KdfMetadata): Promise<SecretKey> {
  return provider.deriveKey(password, metadata);
}
