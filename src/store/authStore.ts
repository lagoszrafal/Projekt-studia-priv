import { create } from 'zustand';

export type AuthState = 'FIRST_LAUNCH' | 'LOCKED' | 'UNLOCKING' | 'UNLOCKED' | 'ERROR';
type AuthStore = {
  status: AuthState; initialized: boolean; errorMessage: string | null;
  initialize: (hasVault: boolean) => void;
  beginUnlock: () => void; unlock: () => void; lock: () => void;
  resetForOnboarding: () => void;
  unlockFailed: (message: string) => void; fail: (message: string) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  status: 'FIRST_LAUNCH', initialized: false, errorMessage: null,
  initialize: (hasVault) => set((state) => state.initialized ? state : {
    status: hasVault ? 'LOCKED' : 'FIRST_LAUNCH', initialized: true, errorMessage: null,
  }),
  beginUnlock: () => set({ status: 'UNLOCKING', errorMessage: null }),
  unlock: () => set({ status: 'UNLOCKED', initialized: true, errorMessage: null }),
  lock: () => set({ status: 'LOCKED', initialized: true, errorMessage: null }),
  resetForOnboarding: () => set({ status: 'FIRST_LAUNCH', initialized: true, errorMessage: null }),
  unlockFailed: (errorMessage) => set({ status: 'LOCKED', initialized: true, errorMessage }),
  fail: (errorMessage) => set({ status: 'ERROR', initialized: true, errorMessage }),
}));
