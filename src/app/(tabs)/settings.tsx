import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Card, Screen, VaultlyButton } from '@/components/ui';
import { createAppDataResetService, vaultSession } from '@/services/container';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { AutoLockSeconds, ClipboardClearSeconds } from '@/store/settingsStore';
import { useVaultStore } from '@/store/vaultStore';
import { useTheme, type ThemePreference } from '@/theme/theme';

const choices: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Systemowy' },
  { value: 'light', label: 'Jasny' },
  { value: 'dark', label: 'Ciemny' },
];
const lockChoices: { value: AutoLockSeconds; label: string }[] = [
  { value: 0, label: 'Natychmiast' },
  { value: 30, label: 'Po 30 sekundach' },
  { value: 60, label: 'Po 1 minucie' },
  { value: 300, label: 'Po 5 minutach' },
  { value: 900, label: 'Po 15 minutach' },
];
const clipboardChoices: { value: ClipboardClearSeconds; label: string }[] = [
  { value: 30, label: 'Po 30 sekundach' },
  { value: 60, label: 'Po 1 minucie' },
  { value: 90, label: 'Po 1,5 minucie' },
  { value: null, label: 'Nie czyścić automatycznie' },
];

function RadioChoice({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();
  return <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked }}
    onPress={onPress}
    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12 }}
  >
    <MaterialCommunityIcons
      name={checked ? 'radiobox-marked' : 'radiobox-blank'}
      color={checked ? colors.accent : colors.textSecondary}
      size={24}
    />
    <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
  </Pressable>;
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const [resetting, setResetting] = useState(false);
  const selected = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const autoLockSeconds = useSettingsStore((state) => state.autoLockSeconds);
  const setAutoLockSeconds = useSettingsStore((state) => state.setAutoLockSeconds);
  const clipboardClearSeconds = useSettingsStore((state) => state.clipboardClearSeconds);
  const setClipboardClearSeconds = useSettingsStore((state) => state.setClipboardClearSeconds);
  const resetSettings = useSettingsStore((state) => state.resetToDefaults);
  const lock = useAuthStore((state) => state.lock);
  const resetForOnboarding = useAuthStore((state) => state.resetForOnboarding);
  const clearSensitiveState = useVaultStore((state) => state.clearSensitiveState);
  const { colors, spacing, typography } = useTheme();

  const logout = () => {
    vaultSession.lock();
    clearSensitiveState();
    lock();
    router.replace('/unlock');
  };

  const confirmLogout = () => {
    Alert.alert('Wylogować?', 'Po wylogowaniu aplikacja zablokuje sejf i będziesz musiał ponownie wpisać hasło główne.', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Wyloguj się', onPress: logout },
    ]);
  };

  const resetApplication = async () => {
    setResetting(true);
    try {
      await createAppDataResetService(db).reset();
      clearSensitiveState();
      resetSettings();
      resetForOnboarding();
      router.replace('/onboarding');
    } catch {
      clearSensitiveState();
      lock();
      Alert.alert('Nie udało się usunąć danych', 'Dla bezpieczeństwa sejf został zablokowany. Spróbuj ponownie po zalogowaniu.');
      router.replace('/unlock');
    } finally {
      setResetting(false);
    }
  };

  const confirmApplicationReset = () => {
    Alert.alert(
      'Usunąć wszystkie dane?',
      'Ta operacja bezpowrotnie usunie sejf, zapisane poświadczenia, ustawienia i dostęp biometryczny. Aplikację będzie trzeba skonfigurować od początku.',
      [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Usuń wszystko', style: 'destructive', onPress: resetApplication },
      ],
    );
  };

  return <Screen scroll contentStyle={{ gap: spacing.xl }}>
    <Text style={[typography.title, { color: colors.textPrimary }]}>Ustawienia</Text>
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.textPrimary }]}>Motyw</Text>
      <Card>{choices.map((choice) => <RadioChoice key={choice.value} checked={selected === choice.value} label={choice.label} onPress={() => setTheme(choice.value)} />)}</Card>
    </View>
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.textPrimary }]}>Automatyczna blokada</Text>
      <Card>{lockChoices.map((choice) => <RadioChoice key={choice.value} checked={autoLockSeconds === choice.value} label={choice.label} onPress={() => setAutoLockSeconds(choice.value)} />)}</Card>
    </View>
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: colors.textPrimary }]}>Czyszczenie schowka</Text>
      <Card>{clipboardChoices.map((choice) => <RadioChoice key={String(choice.value ?? 'never')} checked={clipboardClearSeconds === choice.value} label={choice.label} onPress={() => setClipboardClearSeconds(choice.value)} />)}</Card>
    </View>
    <View style={{ gap: spacing.sm }}>
      <VaultlyButton label="Wyloguj się" variant="secondary" disabled={resetting} onPress={confirmLogout} />
      <VaultlyButton label="Usuń dane aplikacji" loading={resetting} disabled={resetting} style={{ backgroundColor: colors.danger }} onPress={confirmApplicationReset} />
    </View>
  </Screen>;
}
