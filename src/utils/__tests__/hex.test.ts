import { bytesToHex, hexToBytes } from '../hex';

describe('kodowanie hex', () => {
  it('zachowuje wszystkie wartości bajtów', () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 127, 128, 255]);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it('odrzuca nieprawidłowy zapis', () => {
    expect(() => hexToBytes('abc')).toThrow();
    expect(() => hexToBytes('zz')).toThrow();
  });
});
