import { create } from 'zustand';
import type { ThemePreference } from '@/theme/theme';

export type AutoLockSeconds = 0 | 30 | 60 | 300 | 900;
export type ClipboardClearSeconds = 30 | 60 | 90 | null;
type SettingsStore = {
  theme: ThemePreference;
  autoLockSeconds: AutoLockSeconds;
  clipboardClearSeconds: ClipboardClearSeconds;
  setTheme: (theme: ThemePreference) => void;
  setAutoLockSeconds: (autoLockSeconds: AutoLockSeconds) => void;
  setClipboardClearSeconds: (clipboardClearSeconds: ClipboardClearSeconds) => void;
  resetToDefaults: () => void;
};
export const useSettingsStore = create<SettingsStore>((set) => ({
  theme: 'system',
  autoLockSeconds: 30,
  clipboardClearSeconds: 30,
  setTheme: (theme) => set({ theme }),
  setAutoLockSeconds: (autoLockSeconds) => set({ autoLockSeconds }),
  setClipboardClearSeconds: (clipboardClearSeconds) => set({ clipboardClearSeconds }),
  resetToDefaults: () => set({ theme: 'system', autoLockSeconds: 30, clipboardClearSeconds: 30 }),
}));
