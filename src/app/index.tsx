import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/authStore';
import { createAuthService } from '@/services/container';

export default function Index() {
  const db = useSQLiteContext();
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const initialize = useAuthStore((state) => state.initialize);
  const fail = useAuthStore((state) => state.fail);
  useEffect(() => {
    if (initialized) return;
    createAuthService(db).hasVault().then(initialize).catch(() => fail('Nie udało się odczytać sejfu.'));
  }, [db, fail, initialize, initialized]);
  if (!initialized) return null;
  if (status === 'FIRST_LAUNCH') return <Redirect href="/onboarding" />;
  if (status === 'UNLOCKED') return <Redirect href="/(tabs)/vault" />;
  return <Redirect href="/unlock" />;
}
