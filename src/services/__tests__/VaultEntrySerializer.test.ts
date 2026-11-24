import type { VaultEntry } from '@/types/VaultEntry';
import { deserializeVaultEntry, serializeVaultEntry } from '../VaultEntrySerializer';

const entry: VaultEntry = {
  id: '00000000-0000-4000-8000-000000000000',
  type: 'login',
  name: 'Przykład testowy',
  username: 'uzytkownik-testowy',
  password: 'wartosc-testowa',
  favorite: false,
  createdAt: 100,
  updatedAt: 100,
};

describe('serializacja wpisu sejfu', () => {
  it('zachowuje wpis w wersjonowanej kopercie', () => {
    expect(deserializeVaultEntry(serializeVaultEntry(entry))).toEqual(entry);
  });

  it('odrzuca nieznaną wersję i niepełny model', () => {
    expect(() => deserializeVaultEntry(new TextEncoder().encode('{"version":2}'))).toThrow();
    expect(() => deserializeVaultEntry(new TextEncoder().encode('{"version":1,"entry":{}}'))).toThrow();
  });
});
