import type { ThemePreference } from '@/theme/theme';
export interface Settings {
  theme: ThemePreference; autoLockSeconds: 0 | 30 | 60 | 300 | 900;
  clipboardClearSeconds: 30 | 60 | 90 | null;
}
