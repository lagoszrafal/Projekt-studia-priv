export type KdfMetadata = {
  algorithm: 'argon2id'; version: number; salt: string;
  memoryCost: number; iterations: number; parallelism: number;
};

export type EncryptedPayload = {
  ciphertext: string; nonce: string; authenticationTag?: string; cryptoVersion: number;
};

export type SecretKey = { readonly bytes: Uint8Array };

export const DEFAULT_KDF_PARAMETERS = {
  algorithm: 'argon2id',
  version: 1,
  memoryCost: 65_536,
  iterations: 3,
  parallelism: 1,
} as const;
