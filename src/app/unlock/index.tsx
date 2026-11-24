import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, View } from 'react-native';
import { BrandMark, Card, Screen, SecureInput, VaultlyButton } from '@/components/ui';
import { useTheme } from '@/theme/theme';
import { createAuthService, createBiometricVaultService, createVaultService, vaultSession } from '@/services/container';
import { useAuthStore } from '@/store/authStore';
import { useVaultStore } from '@/store/vaultStore';

export default function UnlockScreen() {
  const [password, setPassword] = useState('');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const db = useSQLiteContext();
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.errorMessage);
  const beginUnlock = useAuthStore((state) => state.beginUnlock);
  const markUnlocked = useAuthStore((state) => state.unlock);
  const unlockFailed = useAuthStore((state) => state.unlockFailed);
  const clearSensitiveState = useVaultStore((state) => state.clearSensitiveState);
  const setEntries = useVaultStore((state) => state.setEntries);
  const { colors, spacing, typography } = useTheme();

  useEffect(() => {
    let active = true;
    createBiometricVaultService().isEnabled()
      .then((enabled) => { if (active) setBiometricsEnabled(enabled); })
      .catch(() => { if (active) setBiometricsEnabled(false); });
    return () => { active = false; };
  }, []);

  const finishUnlock = () => {
    markUnlocked();
    router.replace('/(tabs)/vault');
  };

  const loadVaultAndFinish = async (): Promise<boolean> => {
    try {
      setEntries(await createVaultService(db).getAll());
      finishUnlock();
      return true;
    } catch {
      vaultSession.lock();
      clearSensitiveState();
      unlockFailed('Nie udało się wczytać zapisanych wpisów. Spróbuj ponownie.');
      return false;
    }
  };

  const unlock = async () => {
    if (!password || status === 'UNLOCKING') return;
    clearSensitiveState();
    beginUnlock();
    try {
      await createAuthService(db).unlock(password);
      await loadVaultAndFinish();
    } catch {
      vaultSession.lock();
      unlockFailed('Nie udało się odblokować sejfu. Sprawdź hasło i spróbuj ponownie.');
    } finally {
      setPassword('');
    }
  };

  const unlockWithBiometrics = async () => {
    if (status === 'UNLOCKING') return;
    clearSensitiveState();
    beginUnlock();
    try {
      const unlocked = await createBiometricVaultService().unlock();
      if (!unlocked) {
        setBiometricsEnabled(false);
        unlockFailed('Biometria została wyłączona. Użyj hasła głównego.');
        return;
      }
      await loadVaultAndFinish();
    } catch {
      vaultSession.lock();
      unlockFailed('Nie udało się potwierdzić tożsamości. Użyj hasła głównego.');
    }
  };
  return <Screen contentStyle={{ justifyContent: 'center', gap: spacing.xl }}>
    <View style={{ alignItems: 'center', gap: spacing.md }}><BrandMark /><Text style={[typography.title, { color: colors.textPrimary }]}>Witaj ponownie</Text></View>
    <SecureInput label="Hasło główne" value={password} onChangeText={setPassword} onSubmitEditing={unlock} returnKeyType="done" />
    {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    <VaultlyButton label="Odblokuj" loading={status === 'UNLOCKING'} disabled={!password} onPress={unlock} />
    {biometricsEnabled ? <VaultlyButton label="Odblokuj biometrią" variant="secondary" disabled={status === 'UNLOCKING'} onPress={unlockWithBiometrics} /> : null}
    <Card><Text style={[typography.caption, { color: colors.textSecondary }]}>Hasło główne pozostaje tylko w pamięci na czas wyprowadzania klucza i nie jest zapisywane.</Text></Card>
  </Screen>;
}
