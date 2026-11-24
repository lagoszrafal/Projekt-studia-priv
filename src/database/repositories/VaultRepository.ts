import type { EncryptedPayload } from '@/crypto/types';

export type EncryptedVaultRecord = EncryptedPayload & {
  id: string; type: 'login'; createdAt: number; updatedAt: number;
  deletedAt: number | null; syncVersion: number;
};

export interface VaultRepository {
  getAll(): Promise<EncryptedVaultRecord[]>;
  getById(id: string): Promise<EncryptedVaultRecord | null>;
  insert(record: EncryptedVaultRecord): Promise<void>;
  update(record: EncryptedVaultRecord): Promise<void>;
  delete(id: string): Promise<void>;
}
