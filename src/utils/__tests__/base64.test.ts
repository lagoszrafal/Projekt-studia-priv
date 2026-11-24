import { base64ToBytes, bytesToBase64, ensureBase64String } from '../base64';

describe('base64ToBytes', () => {
  it('dekoduje dane z paddingiem i bez zawartości tekstowej', () => {
    expect(base64ToBytes('AAECA/7/')).toEqual(new Uint8Array([0, 1, 2, 3, 254, 255]));
    expect(base64ToBytes('Vg==')).toEqual(new Uint8Array([86]));
    expect(base64ToBytes('')).toEqual(new Uint8Array());
  });

  it('odrzuca uszkodzony zapis', () => {
    expect(() => base64ToBytes('nie-base64!')).toThrow('Nieprawidłowy zapis Base64.');
  });

  it('koduje bajty i normalizuje wartości BLOB z SQLite', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 254, 255]);
    expect(bytesToBase64(bytes)).toBe('AAECA/7/');
    expect(ensureBase64String(bytes)).toBe('AAECA/7/');
    expect(ensureBase64String('Vg==')).toBe('Vg==');
  });
});
