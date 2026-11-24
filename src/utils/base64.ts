const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const block = (first << 16) | (second << 8) | third;
    result += ALPHABET[(block >> 18) & 0x3f];
    result += ALPHABET[(block >> 12) & 0x3f];
    result += index + 1 < bytes.length ? ALPHABET[(block >> 6) & 0x3f] : '=';
    result += index + 2 < bytes.length ? ALPHABET[block & 0x3f] : '=';
  }
  return result;
}

export function ensureBase64String(value: string | Uint8Array): string {
  return typeof value === 'string' ? value : bytesToBase64(value);
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) {
    throw new TypeError('Nieprawidłowy zapis Base64.');
  }
  if (!normalized) return new Uint8Array();

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  const result = new Uint8Array((normalized.length / 4) * 3 - padding);
  let outputIndex = 0;

  for (let index = 0; index < normalized.length; index += 4) {
    const first = ALPHABET.indexOf(normalized[index] ?? '');
    const second = ALPHABET.indexOf(normalized[index + 1] ?? '');
    const thirdCharacter = normalized[index + 2] ?? '=';
    const fourthCharacter = normalized[index + 3] ?? '=';
    const third = thirdCharacter === '=' ? 0 : ALPHABET.indexOf(thirdCharacter);
    const fourth = fourthCharacter === '=' ? 0 : ALPHABET.indexOf(fourthCharacter);
    const block = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (outputIndex < result.length) result[outputIndex++] = (block >> 16) & 0xff;
    if (outputIndex < result.length) result[outputIndex++] = (block >> 8) & 0xff;
    if (outputIndex < result.length) result[outputIndex++] = block & 0xff;
  }

  return result;
}
