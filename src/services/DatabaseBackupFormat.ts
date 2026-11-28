import { DEFAULT_KDF_PARAMETERS, type KdfMetadata } from '@/crypto/types';

const MAGIC = new TextEncoder().encode('VAULTLY-SQLCIPHER-BACKUP\n');
const MAX_MANIFEST_BYTES = 4096;
export const MAX_BACKUP_BYTES = 64 * 1024 * 1024;

type BackupManifest = {
  formatVersion: 1;
  kdf: KdfMetadata;
};

function isSupportedKdf(value: unknown): value is KdfMetadata {
  if (!value || typeof value !== 'object') return false;
  const kdf = value as Partial<KdfMetadata>;
  return kdf.algorithm === DEFAULT_KDF_PARAMETERS.algorithm
    && kdf.version === DEFAULT_KDF_PARAMETERS.version
    && kdf.memoryCost === DEFAULT_KDF_PARAMETERS.memoryCost
    && kdf.iterations === DEFAULT_KDF_PARAMETERS.iterations
    && kdf.parallelism === DEFAULT_KDF_PARAMETERS.parallelism
    && typeof kdf.salt === 'string'
    && /^[0-9a-f]{32}$/i.test(kdf.salt);
}

export function encodeDatabaseBackup(database: Uint8Array, kdf: KdfMetadata): Uint8Array {
  if (!isSupportedKdf(kdf)) throw new Error('Nieobsługiwane parametry szyfrowania kopii.');
  const manifest = new TextEncoder().encode(JSON.stringify({ formatVersion: 1, kdf }));
  const totalLength = MAGIC.length + 4 + manifest.length + database.length;
  if (!database.length || totalLength > MAX_BACKUP_BYTES || manifest.length > MAX_MANIFEST_BYTES) {
    throw new Error('Kopia ma nieprawidłowy rozmiar.');
  }

  const output = new Uint8Array(totalLength);
  output.set(MAGIC);
  new DataView(output.buffer).setUint32(MAGIC.length, manifest.length);
  output.set(manifest, MAGIC.length + 4);
  output.set(database, MAGIC.length + 4 + manifest.length);
  return output;
}

export function decodeDatabaseBackup(input: Uint8Array): { database: Uint8Array; kdf: KdfMetadata } {
  if (input.length > MAX_BACKUP_BYTES || input.length < MAGIC.length + 5) {
    throw new Error('Plik kopii jest nieprawidłowy lub ma nieobsługiwany rozmiar.');
  }
  for (let index = 0; index < MAGIC.length; index += 1) {
    if (input[index] !== MAGIC[index]) throw new Error('To nie jest obsługiwana kopia Vaultly.');
  }

  const manifestLength = new DataView(input.buffer, input.byteOffset, input.byteLength)
    .getUint32(MAGIC.length);
  const manifestStart = MAGIC.length + 4;
  const databaseStart = manifestStart + manifestLength;
  if (
    manifestLength === 0 ||
    manifestLength > MAX_MANIFEST_BYTES ||
    databaseStart >= input.length
  ) {
    throw new Error('Plik kopii jest uszkodzony.');
  }

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(input.subarray(manifestStart, databaseStart))) as BackupManifest;
  } catch {
    throw new Error('Metadane kopii są nieprawidłowe.');
  }
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    manifest.formatVersion !== 1 ||
    !isSupportedKdf(manifest.kdf)
  ) {
    throw new Error('Wersja kopii lub parametry szyfrowania nie są obsługiwane.');
  }

  return { database: input.subarray(databaseStart), kdf: manifest.kdf };
}
