import type { VaultEntry } from '@/types/VaultEntry';
import { VaultCorruptedError } from '@/utils/errors';

type SerializedEnvelope = { version: 1; entry: VaultEntry };

function isVaultEntry(value: unknown): value is VaultEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return entry.type === 'login' &&
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.username === 'string' &&
    typeof entry.password === 'string' &&
    typeof entry.favorite === 'boolean' &&
    typeof entry.createdAt === 'number' &&
    typeof entry.updatedAt === 'number' &&
    (entry.url === undefined || typeof entry.url === 'string') &&
    (entry.notes === undefined || typeof entry.notes === 'string') &&
    (entry.categoryId === undefined || typeof entry.categoryId === 'string');
}

export function serializeVaultEntry(entry: VaultEntry): Uint8Array {
  const envelope: SerializedEnvelope = { version: 1, entry };
  return new TextEncoder().encode(JSON.stringify(envelope));
}

export function deserializeVaultEntry(bytes: Uint8Array): VaultEntry {
  try {
    const envelope = JSON.parse(new TextDecoder().decode(bytes)) as Partial<SerializedEnvelope>;
    if (envelope.version !== 1 || !isVaultEntry(envelope.entry)) throw new VaultCorruptedError();
    return envelope.entry;
  } catch (error) {
    if (error instanceof VaultCorruptedError) throw error;
    throw new VaultCorruptedError();
  }
}
