import type { VaultEntry } from '@/types/VaultEntry';
import { useVaultStore } from '../vaultStore';

const entry: VaultEntry = {
  id: '00000000-0000-4000-8000-000000000000',
  type: 'login',
  name: 'Przykładowy login',
  username: 'uzytkownik',
  password: 'test-only-password',
  favorite: false,
  createdAt: 100,
  updatedAt: 100,
};

describe('vaultStore', () => {
  afterEach(() => useVaultStore.getState().clearSensitiveState());

  it('udostępnia nowo dodany wpis i usuwa dane po zablokowaniu', () => {
    useVaultStore.getState().addEntry(entry);

    expect(useVaultStore.getState().entries).toEqual([entry]);

    useVaultStore.getState().clearSensitiveState();
    expect(useVaultStore.getState().entries).toEqual([]);
  });

  it('nie duplikuje wpisu o tym samym identyfikatorze', () => {
    useVaultStore.getState().setEntries([entry]);
    const updated = { ...entry, name: 'Zmieniona nazwa', updatedAt: 200 };

    useVaultStore.getState().addEntry(updated);

    expect(useVaultStore.getState().entries).toEqual([updated]);
  });

  it('aktualizuje istniejący wpis bez zmiany kolejności listy', () => {
    const secondEntry = { ...entry, id: '00000000-0000-4000-8000-000000000002', name: 'Drugi wpis' };
    useVaultStore.getState().setEntries([entry, secondEntry]);
    const updated = { ...entry, name: 'Zmieniona nazwa', updatedAt: 200 };

    useVaultStore.getState().updateEntry(updated);

    expect(useVaultStore.getState().entries).toEqual([updated, secondEntry]);
  });

  it('dodaje zaktualizowany wpis do pustej pamięci po wejściu bezpośrednim', () => {
    useVaultStore.getState().updateEntry(entry);

    expect(useVaultStore.getState().entries).toEqual([entry]);
  });
});
