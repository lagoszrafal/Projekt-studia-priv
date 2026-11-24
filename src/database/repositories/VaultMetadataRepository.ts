import type { EncryptedPayload, KdfMetadata } from '@/crypto/types';

export type VaultMetadata = {
  kdf: KdfMetadata;
  wrappedVaultKey: EncryptedPayload;
  createdAt: number;
  updatedAt: number;
};

export interface VaultMetadataRepository {
  exists(): Promise<boolean>;
  get(): Promise<VaultMetadata | null>;
  create(metadata: VaultMetadata): Promise<void>;
}
