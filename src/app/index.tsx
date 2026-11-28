import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/authStore';
import { createAuthService, databaseCipherService } from '@/services/container';
import { ScreenSecurityService } from '@/security/ScreenSecurityService';

export default function Index() {
  const db = useSQLiteContext();
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const initialize = useAuthStore((state) => state.initialize);
  const fail = useAuthStore((state) => state.fail);
  ScreenSecurityService(true);
  useEffect(() => {
    if (initialized) return;
    async function initializeVault() {
      try {
        const authService = createAuthService(db);
        let hasVault: boolean;
        try {
          hasVault = await authService.hasVault();
        } catch (error) {
          const cipherState = await databaseCipherService.getState();
          if (!cipherState || cipherState.status === 'ready') throw error;
          await databaseCipherService.activateStoredKey(db);
          hasVault = await authService.hasVault();
        }
        initialize(hasVault);
      } catch {
        fail('Nie udało się odczytać sejfu.');
      }
    }

    void initializeVault();
  }, [db, fail, initialize, initialized]);
  if (!initialized) return null;
  if (status === 'FIRST_LAUNCH') return <Redirect href="/onboarding" />;
  if (status === 'UNLOCKED') return <Redirect href="/(tabs)/vault" />;
  return <Redirect href="/unlock" />;
}
