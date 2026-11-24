import * as Crypto from 'expo-crypto';

export interface SecureRandom { bytes(length: number): Uint8Array }

export class ExpoSecureRandom implements SecureRandom {
  bytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length <= 0) throw new RangeError('Długość musi być dodatnią liczbą całkowitą.');
    return Crypto.getRandomBytes(length);
  }
}
