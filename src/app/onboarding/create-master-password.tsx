import { useState } from 'react';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, View } from 'react-native';
import { Card, PasswordStrengthMeter, Screen, SecureInput, VaultlyButton } from '@/components/ui';
import { useTheme } from '@/theme/theme';
import { createAuthService } from '@/services/container';

export default function CreateMasterPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const mismatch = submitted && password !== confirmation;
  const tooShort = submitted && password.length < 12;
  const continueFlow = async () => {
    setSubmitted(true);
    if (password.length < 12 || password !== confirmation) return;
    setLoading(true);
    setServiceError(null);
    try {
      await createAuthService(db).createVault(password);
      router.replace('/onboarding/biometrics');
    } catch {
      setServiceError('Nie udało się utworzyć sejfu. Spróbuj ponownie.');
    } finally {
      setPassword('');
      setConfirmation('');
      setLoading(false);
    }
  };
  return <Screen scroll contentStyle={{ gap: spacing.xl }}>
    <View style={{ gap: spacing.sm }}><Text style={[typography.title, { color: colors.textPrimary }]}>Utwórz hasło główne</Text><Text style={[typography.body, { color: colors.textSecondary }]}>Użyj długiego, unikalnego hasła. Vaultly nie będzie go przechowywać.</Text></View>
    <View style={{ gap: spacing.lg }}>
      <SecureInput label="Hasło główne" value={password} onChangeText={setPassword} textContentType="newPassword" error={tooShort ? 'Użyj co najmniej 12 znaków.' : undefined} />
      <PasswordStrengthMeter password={password} />
      <SecureInput label="Powtórz hasło" value={confirmation} onChangeText={setConfirmation} textContentType="newPassword" error={mismatch ? 'Hasła nie są identyczne.' : undefined} />
    </View>
    <Card><Text style={[typography.caption, { color: colors.textSecondary }]}>Hasło nie zostanie zapisane. Posłuży do wyprowadzenia klucza Argon2id, który opakuje losowy klucz sejfu.</Text></Card>
    {serviceError ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{serviceError}</Text> : null}
    <VaultlyButton label="Utwórz sejf" loading={loading} onPress={continueFlow} />
  </Screen>;
}
