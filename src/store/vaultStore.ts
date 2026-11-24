import { create } from 'zustand';
import type { VaultEntry } from '@/types/VaultEntry';

type VaultStore = {
  entries: VaultEntry[];
  setEntries: (entries: VaultEntry[]) => void;
  addEntry: (entry: VaultEntry) => void;
  updateEntry: (entry: VaultEntry) => void;
  clearSensitiveState: () => void;
};

export const useVaultStore = create<VaultStore>((set) => ({
  entries: [],
  setEntries: (entries) => set({ entries }),
  addEntry: (entry) => set((state) => ({
    entries: [entry, ...state.entries.filter((item) => item.id !== entry.id)],
  })),
  updateEntry: (entry) => set((state) => ({
    entries: state.entries.some((item) => item.id === entry.id)
      ? state.entries.map((item) => item.id === entry.id ? entry : item)
      : [entry, ...state.entries],
  })),
  clearSensitiveState: () => set({ entries: [] }),
}));
