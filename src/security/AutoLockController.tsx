import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import { shouldAutoLock } from '@/services/AutoLockService';
import { vaultSession } from '@/services/container';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useVaultStore } from '@/store/vaultStore';

export function AutoLockController() {
  const status = useAuthStore((state) => state.status);
  const lock = useAuthStore((state) => state.lock);
  const clearSensitiveState = useVaultStore((state) => state.clearSensitiveState);
  const timeout = useSettingsStore((state) => state.autoLockSeconds);
  const backgroundedAt = useRef<number | null>(null);
  const currentState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const lockNow = () => {
      vaultSession.lock();
      clearSensitiveState();
      lock();
      router.replace('/unlock');
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = currentState.current === 'active';
      currentState.current = nextState;
      if (wasActive && nextState !== 'active') {
        backgroundedAt.current = Date.now();
        if (status === 'UNLOCKED' && timeout === 0) lockNow();
        return;
      }
      if (nextState === 'active' && backgroundedAt.current !== null) {
        if (status === 'UNLOCKED' && shouldAutoLock(backgroundedAt.current, Date.now(), timeout)) lockNow();
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [clearSensitiveState, lock, status, timeout]);
  return null;
}
