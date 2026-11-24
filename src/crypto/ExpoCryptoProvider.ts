import { argon2id } from '@sonnetstationsolutions/expo-argon2';
import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytes,
} from 'expo-crypto';
import type { CryptoProvider } from './CryptoProvider';
import type { EncryptedPayload, KdfMetadata, SecretKey } from './types';
import { hexToBytes } from '@/utils/hex';
import { base64ToBytes, bytesToBase64 } from '@/utils/base64';
import { CryptoVersionUnsupportedError } from '@/utils/errors';

const AES_KEY_BYTES = 32;
const AES_GCM_VERSION = 1;
const AES_GCM_TAG_BYTES = 16;
const ARGON2_VERSION_13 = 0x13;

export function combineEncryptedPayload(payload: EncryptedPayload): Uint8Array {
  if (!payload.authenticationTag) throw new CryptoVersionUnsupportedError();
  const nonce = base64ToBytes(payload.nonce);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const tag = base64ToBytes(payload.authenticationTag);
  if (nonce.length !== 12) throw new CryptoVersionUnsupportedError();
  if (tag.length !== AES_GCM_TAG_BYTES) throw new CryptoVersionUnsupportedError();

  const combined = new Uint8Array(nonce.length + ciphertext.length + tag.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  combined.set(tag, nonce.length + ciphertext.length);
  return combined;
}

export class ExpoCryptoProvider implements CryptoProvider {
  async deriveKey(masterPassword: string, metadata: KdfMetadata): Promise<SecretKey> {
    if (metadata.algorithm !== 'argon2id' || metadata.version !== 1) {
      throw new CryptoVersionUnsupportedError();
    }
    const passwordBytes = new TextEncoder().encode(masterPassword);
    const salt = hexToBytes(metadata.salt);
    try {
      const bytes = await argon2id({
        password: passwordBytes,
        salt,
        memory: metadata.memoryCost,
        iterations: metadata.iterations,
        parallelism: metadata.parallelism,
        hashLength: AES_KEY_BYTES,
        version: ARGON2_VERSION_13,
      });
      return { bytes };
    } finally {
      passwordBytes.fill(0);
      salt.fill(0);
    }
  }

  async generateVaultKey(): Promise<SecretKey> {
    return { bytes: getRandomBytes(AES_KEY_BYTES) };
  }

  async encrypt(
    plaintext: Uint8Array,
    key: SecretKey,
    associatedData?: Uint8Array,
  ): Promise<EncryptedPayload> {
    const aesKey = await AESEncryptionKey.import(key.bytes);
    const sealed = await aesEncryptAsync(plaintext, aesKey, {
      nonce: { length: 12 },
      tagLength: 16,
      additionalData: associatedData,
    });
    return {
      // Always encode bytes in JS. Expo Crypto's Android record uses
      // `outputFormat`, while its public TypeScript API exposes `encoding`.
      // Depending on the native bridge, requesting base64 via the object can
      // therefore return a Uint8Array that SQLite persists as a BLOB.
      ciphertext: bytesToBase64(await sealed.ciphertext()),
      nonce: bytesToBase64(await sealed.iv()),
      authenticationTag: bytesToBase64(await sealed.tag()),
      cryptoVersion: AES_GCM_VERSION,
    };
  }

  async decrypt(
    payload: EncryptedPayload,
    key: SecretKey,
    associatedData?: Uint8Array,
  ): Promise<Uint8Array> {
    if (payload.cryptoVersion !== AES_GCM_VERSION || !payload.authenticationTag) {
      throw new CryptoVersionUnsupportedError();
    }
    const aesKey = await AESEncryptionKey.import(key.bytes);
    // Reconstruct one IV || ciphertext || tag buffer. This avoids the overloaded
    // Android fromParts bridge, whose third argument can be interpreted differently.
    const sealed = AESSealedData.fromCombined(combineEncryptedPayload(payload), {
      ivLength: 12,
      tagLength: AES_GCM_TAG_BYTES,
    });
    return aesDecryptAsync(sealed, aesKey, { output: 'bytes', additionalData: associatedData });
  }

  destroyKey(key: SecretKey): void {
    key.bytes.fill(0);
  }
}
